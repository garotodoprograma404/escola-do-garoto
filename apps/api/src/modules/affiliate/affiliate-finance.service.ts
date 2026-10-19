import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { transactions, withdrawals } from '../../database/schema/index.js'
import { AffiliateCommissionService } from './affiliate-commission.service.js'
import { centsToReais, reaisToCents } from './affiliate-money.js'
import type { FinancialsQuery, RequestWithdrawalInput } from './affiliate.schemas.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
/** Saques nestes estados já "reservam" saldo (o dinheiro está comprometido). */
const RESERVING_WITHDRAWAL_STATUSES = ['pending', 'approved', 'processing', 'completed'] as const
const PENDING_WITHDRAWAL_STATUSES = ['pending', 'approved', 'processing'] as const
/** Teto de linhas por lista do extrato (as mais recentes); o saldo é calculado sobre tudo. */
const STATEMENT_LIMIT = 500

/** Chave da trava de saque por pessoa e escopo. Quem criar saque (produtor/afiliado) usa a mesma. */
function withdrawalLockKey(scope: 'producer' | 'affiliate', userId: string): string {
  return `withdrawal:${scope}:${userId}`
}

type AffiliateFinancialTransaction = {
  id: string
  type: 'commission' | 'withdrawal'
  amount: number
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'refunded'
  description: string
  course_title?: string
  created_at: string
}

export type AffiliateFinancials = {
  balance: { available: number; pending: number; total: number; lifetime: number }
  transactions: AffiliateFinancialTransaction[]
  pending_withdrawals: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!isRecord(metadata)) return null
  const value = metadata[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function commissionDescription(metadata: unknown): string {
  const custom = metadataString(metadata, 'description')
  if (custom) return custom
  const title = metadataString(metadata, 'course_title')
  return title ? `Comissão de afiliado - ${title}` : 'Comissão de afiliado'
}

function normalizeWithdrawalStatus(status: string): AffiliateFinancialTransaction['status'] {
  switch (status) {
    case 'pending':
    case 'approved':
      return 'pending'
    case 'processing':
      return 'processing'
    case 'completed':
      return 'completed'
    default:
      return 'failed' // rejected, cancelled
  }
}

function rangeStart(range: FinancialsQuery['range']): Date | null {
  const days = { '7d': 7, '30d': 30, '90d': 90, all: 0 }[range]
  return days ? new Date(Date.now() - days * ONE_DAY_MS) : null
}

/** Financeiro do afiliado: saldo, extrato e pedido de saque. */
@Injectable()
export class AffiliateFinanceService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AffiliateCommissionService) private readonly commissions: AffiliateCommissionService,
  ) {}

  /** Totais de comissão por status e de saques reservados, tudo em centavos e feito no banco. */
  private async getTotals(userId: string, executor: DbExecutor) {
    const [commissionRows, reservedRows] = await Promise.all([
      executor
        .select({
          status: transactions.status,
          cents: sql<string>`coalesce(sum(round(abs(${transactions.amount}) * 100)), 0)::text`,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.type, 'affiliate_commission')))
        .groupBy(transactions.status),
      executor
        .select({
          status: withdrawals.status,
          cents: sql<string>`coalesce(sum(round(abs(${withdrawals.amount}) * 100)), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(withdrawals)
        .where(and(eq(withdrawals.userId, userId), eq(withdrawals.accountScope, 'affiliate')))
        .groupBy(withdrawals.status),
    ])

    const commissionCents = (status: string) =>
      Number(commissionRows.find((row) => row.status === status)?.cents ?? 0)
    const releasedCents = commissionCents('completed')
    const pendingCents = commissionCents('pending')
    const reversedCents = commissionCents('refunded') + commissionCents('failed')

    const reservedCents = reservedRows
      .filter((row) => (RESERVING_WITHDRAWAL_STATUSES as readonly string[]).includes(row.status))
      .reduce((sum, row) => sum + Number(row.cents), 0)
    const pendingWithdrawals = reservedRows
      .filter((row) => (PENDING_WITHDRAWAL_STATUSES as readonly string[]).includes(row.status))
      .reduce((sum, row) => sum + row.count, 0)

    return { releasedCents, pendingCents, reversedCents, reservedCents, pendingWithdrawals }
  }

  /** Saldo sacável agora = comissões liberadas − saques já pedidos. Nunca negativo. */
  async getAvailableBalanceCents(userId: string, executor: DbExecutor = this.db): Promise<number> {
    const totals = await this.getTotals(userId, executor)
    return Math.max(0, totals.releasedCents - totals.reservedCents)
  }

  async getFinancials(userId: string, query: FinancialsQuery): Promise<AffiliateFinancials> {
    await this.commissions.releaseEligibleCommissions(userId)

    const totals = await this.getTotals(userId, this.db)
    const start = rangeStart(query.range)

    const wantsCommissions = query.type === 'all' || query.type === 'commission'
    const wantsWithdrawals = query.type === 'all' || query.type === 'withdrawal'

    const [commissionRows, withdrawalRows] = await Promise.all([
      wantsCommissions
        ? this.db
            .select({
              id: transactions.id,
              amount: transactions.amount,
              status: transactions.status,
              metadata: transactions.metadata,
              createdAt: transactions.createdAt,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.type, 'affiliate_commission'),
                start ? gte(transactions.createdAt, start) : undefined,
              ),
            )
            .orderBy(desc(transactions.createdAt))
            .limit(STATEMENT_LIMIT)
        : Promise.resolve([]),
      wantsWithdrawals
        ? this.db
            .select({
              id: withdrawals.id,
              amount: withdrawals.amount,
              status: withdrawals.status,
              method: withdrawals.method,
              notes: withdrawals.notes,
              createdAt: withdrawals.createdAt,
              requestedAt: withdrawals.requestedAt,
            })
            .from(withdrawals)
            .where(
              and(
                eq(withdrawals.userId, userId),
                eq(withdrawals.accountScope, 'affiliate'),
                start ? gte(withdrawals.requestedAt, start) : undefined,
              ),
            )
            .orderBy(desc(withdrawals.createdAt))
            .limit(STATEMENT_LIMIT)
        : Promise.resolve([]),
    ])

    const commissionItems: AffiliateFinancialTransaction[] = commissionRows.map((row) => ({
      id: String(row.id),
      type: 'commission',
      amount: centsToReais(reaisToCents(row.amount)),
      status: row.status,
      description: commissionDescription(row.metadata),
      course_title: metadataString(row.metadata, 'course_title') ?? undefined,
      created_at: row.createdAt.toISOString(),
    }))

    const withdrawalItems: AffiliateFinancialTransaction[] = withdrawalRows.map((row) => ({
      id: `withdrawal-${row.id}`,
      type: 'withdrawal',
      amount: -Math.abs(centsToReais(reaisToCents(row.amount))),
      status: normalizeWithdrawalStatus(row.status),
      description:
        row.notes ||
        `Solicitação de saque via ${row.method === 'pix' ? 'PIX' : 'Transferência bancária'}`,
      created_at: (row.requestedAt ?? row.createdAt).toISOString(),
    }))

    const available = Math.max(0, totals.releasedCents - totals.reservedCents)
    const pending = Math.max(0, totals.pendingCents)

    return {
      balance: {
        available: centsToReais(available),
        pending: centsToReais(pending),
        total: centsToReais(available + pending),
        lifetime: centsToReais(totals.releasedCents + totals.pendingCents + totals.reversedCents),
      },
      transactions: [...commissionItems, ...withdrawalItems].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
      pending_withdrawals: totals.pendingWithdrawals,
    }
  }

  /**
   * Pedido de saque do afiliado. O saldo é calculado AQUI, dentro de uma transação que trava o
   * (afiliado, escopo): dois pedidos simultâneos esperam um pelo outro e o segundo já enxerga o
   * saque do primeiro (sem a trava, o saldo seria conferido em paralelo e daria para sacar duas vezes).
   */
  async requestWithdrawal(
    userId: string,
    input: RequestWithdrawalInput,
  ): Promise<{ success: true; id: number }> {
    const amountCents = reaisToCents(input.amount)
    if (amountCents <= 0) throw new BadRequestException('Valor de saque inválido')

    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${withdrawalLockKey('affiliate', userId)}, 0))`,
      )
      await this.commissions.releaseEligibleCommissions(userId, tx)

      const available = await this.getAvailableBalanceCents(userId, tx)
      if (amountCents > available) throw new BadRequestException('Saldo insuficiente')

      const bankData =
        input.method === 'pix'
          ? { pix_key: input.pix_key }
          : {
              bank_code: input.bank_code,
              agency: input.bank_agency,
              account: input.bank_account,
              account_type: input.account_type,
            }

      const [created] = await tx
        .insert(withdrawals)
        .values({
          userId,
          amount: centsToReais(amountCents),
          accountScope: 'affiliate',
          method: input.method,
          status: 'pending',
          bankData,
          notes: `Solicitação de saque (affiliate) via ${input.method === 'pix' ? 'PIX' : 'Transferência Bancária'}`,
        })
        .returning({ id: withdrawals.id })
      return { success: true as const, id: created!.id }
    })
  }
}
