import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  checkoutOrderItems,
  checkoutOrders,
  courses,
  invoices,
  profiles,
  transactions,
  users,
  withdrawals,
} from '../../database/schema/index.js'
import { dbToCents } from '../checkout/money.js'
import type { WithdrawalFilters } from './finance.schemas.js'

const PAID_ORDER_STATUSES = ['approved', 'free_completed']
const OPEN_WITHDRAWAL_STATUSES = ['pending', 'approved', 'processing'] as const
const ONE_DAY_MS = 24 * 60 * 60 * 1000
/** Brasil não tem horário de verão desde 2019: o dia "civil" do admin é UTC-3 o ano todo. */
const BRT = 'America/Sao_Paulo'

type WithdrawalStatus =
  'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled'

export type FinancialMetrics = {
  totalRevenue: number
  monthlyRevenue: number
  pendingWithdrawals: number
  availableBalance: number
  totalCommissions: number
  refundRate: number
  averageTicket: number
  transactionCount: number
}

export type WithdrawalRequest = {
  id: string
  producerId: string
  producerName: string
  producerEmail: string
  accountScope: 'producer' | 'affiliate'
  method: 'pix' | 'bank_transfer'
  amount: number
  fee: number
  netAmount: number
  status: WithdrawalStatus
  requestedAt: string
  processedAt: string | null
  approvedBy: string | null
  rejectedReason: string | null
  bankAccount: {
    bank: string
    agency: string
    account: string
    accountType: 'checking' | 'savings'
    holderName: string
    holderDocument: string
  }
  metadata: { courseSales: number; period: string }
}

export type FinanceTransaction = {
  id: string
  type: 'sale' | 'withdrawal' | 'refund' | 'commission' | 'anticipation' | 'affiliate_commission'
  amount: number
  fee: number
  netAmount: number
  status: 'pending' | 'completed' | 'failed'
  userId: string
  userName: string
  courseId?: string
  courseName?: string
  description: string
  createdAt: string
  completedAt: string | null
}

export type LiquidityData = {
  currentBalance: number
  projectedIncome: number
  pendingPayments: number
  availableForWithdrawal: number
  reservedAmount: number
  nextPaymentDate: string
  cashFlow: Array<{ date: string; income: number; outcome: number; balance: number }>
}

export type FiscalCompliance = {
  totalInvoiced: number
  totalTaxes: number
  pendingInvoices: number
  issuedInvoices: number
  taxRate: number
  complianceStatus: 'compliant' | 'pending' | 'issues'
  lastAuditDate: string | null
  nextAuditDate: string
}

type WithdrawalRow = typeof withdrawals.$inferSelect

type BankData = {
  pix_key?: string
  bank?: string
  bank_code?: string
  agency?: string
  account?: string
  account_type?: 'checking' | 'savings'
  holder_name?: string
  holder_document?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const toReais = (value: string | number | null | undefined) => dbToCents(value) / 100
const num = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function monthLabel(yearMonth: string): string {
  const [year = 1970, month = 1] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Dia (`YYYY-MM-DD`) de uma data, no fuso do Brasil. */
function brtDay(date: Date): string {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Leituras do financeiro do ADMIN (painel de gestão, liquidez, fiscal, transações). Os totais
 * são agregações no banco (nunca carregam TODOS os pedidos em memória). O acesso é só admin (`@Roles(['admin'])` no controller).
 */
@Injectable()
export class AdminFinanceService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getFinancialMetrics(): Promise<FinancialMetrics> {
    const monthlyCutoff = new Date(Date.now() - 30 * ONE_DAY_MS)
    const [[sales], [orderCounts], withdrawalTotals] = await Promise.all([
      this.db
        .select({
          gross: sql<string>`coalesce(sum(${checkoutOrderItems.finalPrice}), 0)`,
          platform: sql<string>`coalesce(sum(${checkoutOrderItems.platformAmount}), 0)`,
          producer: sql<string>`coalesce(sum(${checkoutOrderItems.producerAmount}), 0)`,
          monthly: sql<string>`coalesce(sum(${checkoutOrderItems.finalPrice}) filter (where ${checkoutOrders.createdAt} >= ${monthlyCutoff.toISOString()}::timestamptz), 0)`,
          items: count(),
        })
        .from(checkoutOrderItems)
        .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
        .where(inArray(checkoutOrders.status, PAID_ORDER_STATUSES)),
      this.db
        .select({
          refunded: sql<number>`count(*) filter (where ${checkoutOrders.status} = 'refunded')::int`,
          charged: sql<number>`count(*) filter (where ${checkoutOrders.status} in ('approved', 'refunded'))::int`,
        })
        .from(checkoutOrders),
      this.db
        .select({
          status: withdrawals.status,
          total: sql<string>`coalesce(sum(${withdrawals.amount}), 0)`,
        })
        .from(withdrawals)
        .groupBy(withdrawals.status),
    ])

    const grossCents = dbToCents(sales?.gross)
    const producerCents = dbToCents(sales?.producer)
    const items = sales?.items ?? 0
    const pendingCents = withdrawalTotals
      .filter((row) => (OPEN_WITHDRAWAL_STATUSES as readonly string[]).includes(row.status))
      .reduce((sum, row) => sum + dbToCents(row.total), 0)
    const completedCents = withdrawalTotals
      .filter((row) => row.status === 'completed')
      .reduce((sum, row) => sum + dbToCents(row.total), 0)

    const charged = orderCounts?.charged ?? 0
    return {
      totalRevenue: grossCents / 100,
      monthlyRevenue: dbToCents(sales?.monthly) / 100,
      pendingWithdrawals: pendingCents / 100,
      availableBalance: Math.max(0, producerCents - completedCents - pendingCents) / 100,
      totalCommissions: dbToCents(sales?.platform) / 100,
      refundRate:
        charged > 0 ? Math.round(((orderCounts?.refunded ?? 0) / charged) * 1000) / 10 : 0,
      averageTicket: items > 0 ? Math.round(grossCents / items) / 100 : 0,
      transactionCount: items,
    }
  }

  async getWithdrawalRequests(filters: WithdrawalFilters): Promise<WithdrawalRequest[]> {
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00-03:00`) : null
    const to = filters.dateTo ? new Date(`${filters.dateTo}T00:00:00-03:00`) : null
    const rows = await this.db
      .select()
      .from(withdrawals)
      .where(
        and(
          filters.status !== 'ALL' ? eq(withdrawals.status, filters.status) : undefined,
          filters.producerId !== 'ALL' ? eq(withdrawals.userId, filters.producerId) : undefined,
          from ? gte(withdrawals.requestedAt, from) : undefined,
          // O dia final entra inteiro: vale até o começo do dia seguinte.
          to ? lt(withdrawals.requestedAt, new Date(to.getTime() + ONE_DAY_MS)) : undefined,
        ),
      )
      .orderBy(desc(withdrawals.requestedAt), desc(withdrawals.id))
      .limit(1000)

    const mapped = await this.mapWithdrawals(rows)
    if (!filters.searchTerm) return mapped
    const term = filters.searchTerm.toLowerCase()
    return mapped.filter((withdrawal) =>
      [
        withdrawal.producerName,
        withdrawal.producerEmail,
        withdrawal.id,
        withdrawal.bankAccount.holderName,
        withdrawal.bankAccount.holderDocument,
      ].some((value) => value.toLowerCase().includes(term)),
    )
  }

  async getWithdrawal(id: number): Promise<WithdrawalRequest | undefined> {
    const [row] = await this.db.select().from(withdrawals).where(eq(withdrawals.id, id))
    return row ? (await this.mapWithdrawals([row]))[0] : undefined
  }

  /**
   * Transações (vendas, comissões, saques…), as mais novas primeiro. Sem opções são as 100 mais
   * recentes (a tela); com período e `limit` maior é o que o relatório exporta.
   */
  async getTransactions(
    options: { from?: Date; to?: Date; limit?: number } = {},
  ): Promise<FinanceTransaction[]> {
    const limit = options.limit ?? 100
    const rows = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          options.from ? gte(transactions.createdAt, options.from) : undefined,
          options.to ? lt(transactions.createdAt, options.to) : undefined,
        ),
      )
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(limit)
    const withdrawalRows = await this.db
      .select()
      .from(withdrawals)
      .where(
        and(
          options.from ? gte(withdrawals.requestedAt, options.from) : undefined,
          options.to ? lt(withdrawals.requestedAt, options.to) : undefined,
        ),
      )
      .orderBy(desc(withdrawals.requestedAt))
      .limit(limit)
    const withdrawalRequests = await this.mapWithdrawals(withdrawalRows)

    const userIds = [...new Set(rows.map((row) => row.userId))]
    const courseIds = [...new Set(rows.flatMap((row) => (row.courseId ? [row.courseId] : [])))]
    const [profileRows, courseRows] = await Promise.all([
      userIds.length > 0
        ? this.db
            .select({
              id: profiles.id,
              fullName: profiles.fullName,
              displayName: profiles.displayName,
            })
            .from(profiles)
            .where(inArray(profiles.id, userIds))
        : [],
      courseIds.length > 0
        ? this.db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(inArray(courses.id, courseIds))
        : [],
    ])
    const nameById = new Map(
      profileRows.map((row) => [row.id, row.displayName || row.fullName || 'Usuário']),
    )
    const titleById = new Map(courseRows.map((row) => [row.id, row.title]))

    const fromTransactions: FinanceTransaction[] = rows.map((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {}
      const source = metadata.source
      let description = 'Transação financeira'
      let fee = 0
      let netAmount = row.amount
      let courseName = row.courseId ? titleById.get(row.courseId) : undefined

      if (source === 'student_checkout') {
        const courseCount = Array.isArray(metadata.course_ids)
          ? metadata.course_ids.length
          : num(metadata.items_count)
        fee = num(metadata.platform_commission_total)
        netAmount = toReais(row.amount - fee)
        description =
          courseCount > 0
            ? `Checkout do aluno com ${courseCount} curso${courseCount > 1 ? 's' : ''}`
            : 'Checkout do aluno'
      } else if (source === 'producer_course_sale') {
        courseName = typeof metadata.course_title === 'string' ? metadata.course_title : courseName
        fee = num(metadata.platform_commission_amount)
        netAmount = num(metadata.producer_net_amount)
        description = courseName ? `Venda do produtor - ${courseName}` : 'Venda do produtor'
      } else if (source === 'affiliate_commission_pending' || row.type === 'affiliate_commission') {
        courseName = typeof metadata.course_title === 'string' ? metadata.course_title : courseName
        description = courseName ? `Comissão de afiliado - ${courseName}` : 'Comissão de afiliado'
      } else if (row.type === 'sale') {
        description = courseName ? `Venda - ${courseName}` : 'Venda'
      }

      return {
        id: `transaction-${row.id}`,
        type: row.type,
        amount: row.amount,
        fee,
        netAmount,
        status:
          row.status === 'completed'
            ? 'completed'
            : row.status === 'pending'
              ? 'pending'
              : 'failed',
        userId: row.userId,
        userName: nameById.get(row.userId) ?? 'Usuário',
        courseId: row.courseId ? String(row.courseId) : undefined,
        courseName,
        description,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.status === 'completed' ? row.createdAt.toISOString() : null,
      }
    })

    const fromWithdrawals: FinanceTransaction[] = withdrawalRequests.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      type: 'withdrawal',
      amount: -Math.abs(withdrawal.amount),
      fee: withdrawal.fee,
      netAmount: -Math.abs(withdrawal.netAmount),
      status:
        withdrawal.status === 'completed'
          ? 'completed'
          : withdrawal.status === 'pending' ||
              withdrawal.status === 'approved' ||
              withdrawal.status === 'processing'
            ? 'pending'
            : 'failed',
      userId: withdrawal.producerId,
      userName: withdrawal.producerName,
      description:
        withdrawal.status === 'completed'
          ? 'Saque concluído'
          : withdrawal.status === 'rejected'
            ? 'Saque rejeitado'
            : withdrawal.status === 'approved'
              ? 'Saque aprovado'
              : withdrawal.status === 'processing'
                ? 'Saque em processamento'
                : `Solicitação de saque ${withdrawal.accountScope === 'affiliate' ? 'de afiliado' : 'de produtor'}`,
      createdAt: withdrawal.requestedAt,
      completedAt: withdrawal.processedAt,
    }))

    return [...fromTransactions, ...fromWithdrawals]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit)
  }

  async getLiquidityData(): Promise<LiquidityData> {
    const today = new Date()
    const startOfWindow = new Date(today.getTime() - 29 * ONE_DAY_MS)
    const windowStart = new Date(`${brtDay(startOfWindow)}T00:00:00-03:00`)

    const [[income], incomeByDay, [outflow], outflowByDay, openWithdrawals, nextPending] =
      await Promise.all([
        this.db
          .select({ total: sql<string>`coalesce(sum(${checkoutOrderItems.finalPrice}), 0)` })
          .from(checkoutOrderItems)
          .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
          .where(inArray(checkoutOrders.status, PAID_ORDER_STATUSES)),
        this.db
          .select({
            day: sql<string>`to_char(${checkoutOrders.createdAt} at time zone ${BRT}, 'YYYY-MM-DD')`,
            total: sql<string>`coalesce(sum(${checkoutOrderItems.finalPrice}), 0)`,
          })
          .from(checkoutOrderItems)
          .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
          .where(
            and(
              inArray(checkoutOrders.status, PAID_ORDER_STATUSES),
              gte(checkoutOrders.createdAt, windowStart),
            ),
          )
          .groupBy(sql`1`),
        this.db
          .select({ total: sql<string>`coalesce(sum(${withdrawals.amount}), 0)` })
          .from(withdrawals)
          .where(eq(withdrawals.status, 'completed')),
        this.db
          .select({
            day: sql<string>`to_char(coalesce(${withdrawals.processedAt}, ${withdrawals.requestedAt}) at time zone ${BRT}, 'YYYY-MM-DD')`,
            total: sql<string>`coalesce(sum(${withdrawals.amount}), 0)`,
          })
          .from(withdrawals)
          .where(
            and(
              eq(withdrawals.status, 'completed'),
              gte(
                sql`coalesce(${withdrawals.processedAt}, ${withdrawals.requestedAt})`,
                windowStart,
              ),
            ),
          )
          .groupBy(sql`1`),
        this.db
          .select({ total: sql<string>`coalesce(sum(${withdrawals.amount}), 0)` })
          .from(withdrawals)
          .where(inArray(withdrawals.status, [...OPEN_WITHDRAWAL_STATUSES])),
        this.db
          .select({ requestedAt: withdrawals.requestedAt })
          .from(withdrawals)
          .where(inArray(withdrawals.status, [...OPEN_WITHDRAWAL_STATUSES]))
          .orderBy(withdrawals.requestedAt)
          .limit(1),
      ])

    const incomeMap = new Map(incomeByDay.map((row) => [row.day, dbToCents(row.total)]))
    const outflowMap = new Map(outflowByDay.map((row) => [row.day, dbToCents(row.total)]))

    const currentBalanceCents = Math.max(0, dbToCents(income?.total) - dbToCents(outflow?.total))
    const pendingCents = dbToCents(openWithdrawals[0]?.total)

    const days = Array.from({ length: 30 }, (_, index) =>
      brtDay(new Date(today.getTime() - (29 - index) * ONE_DAY_MS)),
    )
    const netInWindow = days.reduce(
      (sum, day) => sum + (incomeMap.get(day) ?? 0) - (outflowMap.get(day) ?? 0),
      0,
    )
    let running = currentBalanceCents - netInWindow
    const cashFlow = days.map((day) => {
      const dayIncome = incomeMap.get(day) ?? 0
      const dayOutcome = outflowMap.get(day) ?? 0
      running += dayIncome - dayOutcome
      return {
        date: day,
        income: dayIncome / 100,
        outcome: dayOutcome / 100,
        balance: running / 100,
      }
    })

    const last7 = cashFlow.slice(-7)
    const projectedIncome =
      (last7.reduce((sum, day) => sum + day.income, 0) / Math.max(last7.length, 1)) * 30

    return {
      currentBalance: currentBalanceCents / 100,
      projectedIncome: Math.round(projectedIncome * 100) / 100,
      pendingPayments: pendingCents / 100,
      availableForWithdrawal: Math.max(0, currentBalanceCents - pendingCents) / 100,
      reservedAmount: pendingCents / 100,
      nextPaymentDate: (
        nextPending[0]?.requestedAt ?? new Date(today.getTime() + 7 * ONE_DAY_MS)
      ).toISOString(),
      cashFlow,
    }
  }

  async getFiscalCompliance(): Promise<FiscalCompliance> {
    const [[invoiced], [orderCount], [issued]] = await Promise.all([
      this.db
        .select({ total: sql<string>`coalesce(sum(${checkoutOrderItems.finalPrice}), 0)` })
        .from(checkoutOrderItems)
        .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
        .where(inArray(checkoutOrders.status, PAID_ORDER_STATUSES)),
      this.db
        .select({ total: count() })
        .from(checkoutOrders)
        .where(inArray(checkoutOrders.status, PAID_ORDER_STATUSES)),
      this.db.select({ total: count() }).from(invoices),
    ])
    const taxRate = 15
    const totalInvoicedCents = dbToCents(invoiced?.total)
    const issuedInvoices = issued?.total ?? 0
    const pendingInvoices = Math.max(0, (orderCount?.total ?? 0) - issuedInvoices)
    return {
      totalInvoiced: totalInvoicedCents / 100,
      totalTaxes: Math.round((totalInvoicedCents * taxRate) / 100) / 100,
      pendingInvoices,
      issuedInvoices,
      taxRate,
      complianceStatus: pendingInvoices > 0 ? 'pending' : 'compliant',
      lastAuditDate: null,
      nextAuditDate: new Date(Date.now() + 90 * ONE_DAY_MS).toISOString(),
    }
  }

  /** Linhas do banco → formato do painel (nome e e-mail de quem pediu, vendas do mês do pedido). */
  async mapWithdrawals(rows: WithdrawalRow[]): Promise<WithdrawalRequest[]> {
    if (rows.length === 0) return []
    const userIds = [...new Set(rows.map((row) => row.userId))]
    const [people, sales] = await Promise.all([
      this.db
        .select({
          id: users.id,
          email: users.email,
          fullName: profiles.fullName,
          displayName: profiles.displayName,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.id, users.id))
        .where(inArray(users.id, userIds)),
      this.db
        .select({
          producerId: checkoutOrderItems.producerId,
          month: sql<string>`to_char(coalesce(${checkoutOrders.finalizedAt}, ${checkoutOrders.paidAt}, ${checkoutOrders.createdAt}) at time zone ${BRT}, 'YYYY-MM')`,
          total: count(),
        })
        .from(checkoutOrderItems)
        .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
        .where(
          and(
            inArray(checkoutOrders.status, PAID_ORDER_STATUSES),
            inArray(checkoutOrderItems.producerId, userIds),
          ),
        )
        .groupBy(checkoutOrderItems.producerId, sql`2`),
    ])
    const personById = new Map(people.map((person) => [person.id, person]))
    const salesByKey = new Map(sales.map((row) => [`${row.producerId}:${row.month}`, row.total]))

    return rows.map((row) => {
      const person = personById.get(row.userId)
      const bank = (isRecord(row.bankData) ? row.bankData : {}) as BankData
      const yearMonth = brtDay(row.requestedAt).slice(0, 7)
      return {
        id: String(row.id),
        producerId: row.userId,
        producerName: person?.displayName || person?.fullName || 'Produtor Desconhecido',
        producerEmail: person?.email ?? '',
        accountScope: row.accountScope === 'affiliate' ? 'affiliate' : 'producer',
        method: row.method,
        amount: row.amount,
        fee: 0,
        netAmount: row.amount,
        status: row.status,
        requestedAt: row.requestedAt.toISOString(),
        processedAt: (row.processedAt ?? row.approvedAt ?? row.rejectedAt)?.toISOString() ?? null,
        approvedBy: row.approvedBy,
        rejectedReason: row.rejectionReason,
        bankAccount: {
          bank: bank.bank || bank.bank_code || '',
          agency: bank.agency || '',
          account: bank.account || '',
          accountType: bank.account_type || 'checking',
          holderName: bank.holder_name || '',
          holderDocument: bank.holder_document || bank.pix_key || '',
        },
        metadata: {
          courseSales: salesByKey.get(`${row.userId}:${yearMonth}`) ?? 0,
          period: monthLabel(yearMonth),
        },
      }
    })
  }
}
