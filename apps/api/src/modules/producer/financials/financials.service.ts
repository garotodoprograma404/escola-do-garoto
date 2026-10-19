import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, inArray, isNotNull, notInArray, sql, type SQL } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../../database/database.module.js'
import {
  courses,
  enrollments,
  profiles,
  transactions,
  withdrawals,
} from '../../../database/schema/index.js'
import { fromCents, toCents } from '../money.js'
import { computeProducerBalance, type ProducerBalanceCents } from './balance.js'

export const FINANCIAL_DATE_RANGES = ['7d', '30d', '90d', 'all'] as const
export const FINANCIAL_TYPES = ['all', 'sale', 'withdrawal', 'refund', 'commission'] as const
export type FinancialDateRange = (typeof FINANCIAL_DATE_RANGES)[number]
export type FinancialType = (typeof FINANCIAL_TYPES)[number]

type FinancialTransaction = {
  id: string
  type: 'sale' | 'withdrawal' | 'refund' | 'commission'
  amount: number
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'refunded'
  description: string
  course_title?: string
  student_name?: string
  created_at: Date
}

export type ProducerFinancials = {
  balance: { available: number; pending: number; total: number; lifetime: number }
  transactions: FinancialTransaction[]
  pending_withdrawals: number
}

/** Teto de linhas por resposta (o histórico completo não é devolvido de uma vez). */
const MAX_ROWS = 500
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 } as const

const WITHDRAWAL_LABEL = { pix: 'PIX', bank_transfer: 'Transferência bancária' } as const

function normalizeType(type: string): FinancialTransaction['type'] {
  if (type === 'sale' || type === 'withdrawal' || type === 'refund') return type
  return 'commission'
}

function normalizeAmount(type: FinancialTransaction['type'], amount: number): number {
  const cents = toCents(amount)
  if (type === 'sale') return fromCents(Math.abs(cents))
  if (type === 'refund' || type === 'withdrawal') return fromCents(-Math.abs(cents))
  return fromCents(cents)
}

function normalizeWithdrawalStatus(status: string): FinancialTransaction['status'] {
  if (status === 'pending' || status === 'approved') return 'pending'
  if (status === 'processing') return 'processing'
  if (status === 'completed') return 'completed'
  return 'failed'
}

function defaultDescription(type: FinancialTransaction['type']): string {
  switch (type) {
    case 'sale':
      return 'Venda aprovada'
    case 'withdrawal':
      return 'Saque'
    case 'refund':
      return 'Reembolso'
    default:
      return 'Comissão'
  }
}

function metadataDescription(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return null
  const description = (metadata as Record<string, unknown>).description
  if (typeof description !== 'string') return null
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Saldo do produtor lido do banco. Usado pela tela de financeiro e, DENTRO da transação com lock,
 * pela validação do saque: é a mesma conta nos dois lugares.
 */
export async function loadProducerBalance(
  executor: DbExecutor,
  producerId: string,
): Promise<{
  balance: ProducerBalanceCents
  hasRevenueData: boolean
  openWithdrawals: number
}> {
  const [sales] = await executor
    .select({
      gross: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'sale' and ${transactions.status} = 'completed'), 0)::text`,
      pending: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'sale' and ${transactions.status} = 'pending'), 0)::text`,
      refunds: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'refund' and ${transactions.status} in ('completed', 'refunded')), 0)::text`,
      commissions: sql<number>`(count(*) filter (where ${transactions.type} in ('commission', 'affiliate_commission')))::int`,
    })
    .from(transactions)
    .where(eq(transactions.userId, producerId))

  const [saques] = await executor
    .select({
      reserved: sql<string>`coalesce(sum(abs(${withdrawals.amount})) filter (where ${withdrawals.status} in ('pending', 'approved', 'processing', 'completed')), 0)::text`,
      open: sql<number>`(count(*) filter (where ${withdrawals.status} in ('pending', 'approved', 'processing')))::int`,
    })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, producerId), eq(withdrawals.accountScope, 'producer')))

  const grossSalesCents = toCents(sales?.gross)
  const pendingSalesCents = toCents(sales?.pending)
  const refundsCents = toCents(sales?.refunds)

  return {
    balance: computeProducerBalance({
      grossSalesCents,
      pendingSalesCents,
      refundsCents,
      reservedWithdrawalsCents: toCents(saques?.reserved),
    }),
    hasRevenueData:
      grossSalesCents > 0 ||
      pendingSalesCents > 0 ||
      refundsCents > 0 ||
      (sales?.commissions ?? 0) > 0,
    openWithdrawals: saques?.open ?? 0,
  }
}

@Injectable()
export class FinancialsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getFinancials(
    producerId: string,
    dateRange: FinancialDateRange,
    type: FinancialType,
  ): Promise<ProducerFinancials> {
    const startDate =
      dateRange === 'all' ? null : new Date(Date.now() - RANGE_DAYS[dateRange] * ONE_DAY_MS)

    const { balance, hasRevenueData, openWithdrawals } = await loadProducerBalance(
      this.db,
      producerId,
    )

    const rows = await this.db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        status: transactions.status,
        metadata: transactions.metadata,
        createdAt: transactions.createdAt,
        courseTitle: courses.title,
        studentName: profiles.fullName,
      })
      .from(transactions)
      // O nome do curso/aluno só aparece quando o curso é DESTE produtor.
      .leftJoin(
        courses,
        and(eq(courses.id, transactions.courseId), eq(courses.producerId, producerId)),
      )
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.id, transactions.enrollmentId),
          isNotNull(courses.id),
          eq(enrollments.courseId, courses.id),
        ),
      )
      .leftJoin(profiles, eq(profiles.id, enrollments.studentId))
      .where(
        and(
          eq(transactions.userId, producerId),
          startDate ? gte(transactions.createdAt, startDate) : undefined,
          this.typeFilter(type),
        ),
      )
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(MAX_ROWS)

    // Sem receita real o painel fica limpo: nem saques aparecem.
    const baseTransactions: FinancialTransaction[] = rows
      .map((row) => {
        const normalizedType = normalizeType(row.type)
        return {
          id: String(row.id),
          type: normalizedType,
          amount: normalizeAmount(normalizedType, row.amount),
          status: row.status,
          description: metadataDescription(row.metadata) ?? defaultDescription(normalizedType),
          course_title: row.courseTitle ?? undefined,
          student_name: row.studentName ?? undefined,
          created_at: row.createdAt,
        }
      })
      .filter((item) => hasRevenueData || item.type !== 'withdrawal')

    // Saques pedidos que ainda não viraram linha em `transactions`.
    let requestedWithdrawals: FinancialTransaction[] = []
    if (hasRevenueData && (type === 'all' || type === 'withdrawal')) {
      const linked = this.db
        .select({ id: transactions.withdrawalId })
        .from(transactions)
        .where(and(eq(transactions.userId, producerId), isNotNull(transactions.withdrawalId)))
      const saques = await this.db
        .select({
          id: withdrawals.id,
          amount: withdrawals.amount,
          status: withdrawals.status,
          method: withdrawals.method,
          notes: withdrawals.notes,
          createdAt: withdrawals.requestedAt,
        })
        .from(withdrawals)
        .where(
          and(
            eq(withdrawals.userId, producerId),
            eq(withdrawals.accountScope, 'producer'),
            notInArray(withdrawals.id, linked),
            startDate ? gte(withdrawals.requestedAt, startDate) : undefined,
          ),
        )
        .orderBy(desc(withdrawals.requestedAt))
        .limit(MAX_ROWS)

      requestedWithdrawals = saques.map((saque) => ({
        id: `withdrawal-${saque.id}`,
        type: 'withdrawal',
        amount: fromCents(-Math.abs(toCents(saque.amount))),
        status: normalizeWithdrawalStatus(saque.status),
        description: saque.notes || `Solicitação de saque via ${WITHDRAWAL_LABEL[saque.method]}`,
        created_at: saque.createdAt,
      }))
    }

    const merged = [...baseTransactions, ...requestedWithdrawals]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, MAX_ROWS)

    return {
      balance: {
        available: fromCents(balance.available),
        pending: fromCents(balance.pending),
        total: fromCents(balance.total),
        lifetime: fromCents(balance.lifetime),
      },
      transactions: merged,
      pending_withdrawals: hasRevenueData ? openWithdrawals : 0,
    }
  }

  private typeFilter(type: FinancialType): SQL | undefined {
    switch (type) {
      case 'all':
        return undefined
      case 'commission':
        return inArray(transactions.type, ['commission', 'affiliate_commission'])
      default:
        return eq(transactions.type, type)
    }
  }
}
