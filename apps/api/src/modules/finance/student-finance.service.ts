import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  courses,
  invoices,
  platformSettings,
  profiles,
  transactions,
} from '../../database/schema/index.js'
import { dbToCents } from '../checkout/money.js'
import { renderInvoiceHtml, type InvoiceData } from './invoice-html.js'
import type { RefundRequestInput, StudentTransactionsQuery } from './finance.schemas.js'

/** Janela para pedir reembolso (mesma da tela: 30 dias da compra). */
const REFUND_WINDOW_DAYS = 30
/** Alíquota informativa do comprovante. */
const INVOICE_TAX_RATE = 15

export type StudentTransaction = {
  id: string
  amount: number
  type: 'purchase' | 'refund'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_method: string
  course_id: string
  course_title: string
  course_thumbnail: string | null
  producer_name: string
  created_at: string
}

export type StudentFinancialStats = {
  total_spent: number
  total_refunded: number
  total_courses_purchased: number
  average_course_price: number
  last_purchase_date: string | null
  primary_payment_method: string | null
}

type TransactionRow = typeof transactions.$inferSelect

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function courseIdsOf(row: Pick<TransactionRow, 'courseId' | 'metadata'>): number[] {
  const metadata = isRecord(row.metadata) ? row.metadata : {}
  const fromMetadata = Array.isArray(metadata.course_ids)
    ? metadata.course_ids.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : []
  if (fromMetadata.length > 0) return fromMetadata
  return row.courseId ? [row.courseId] : []
}

/**
 * Transações que o ALUNO enxerga como suas: as compras dele (a soma de cada pedido) e os
 * reembolsos que ele pediu. As vendas de um produtor (que também são `sale`, mas com o produtor
 * como dono da linha) ficam de fora do histórico de compras.
 */
function studentScope(userId: string) {
  return and(
    eq(transactions.userId, userId),
    or(
      and(
        eq(transactions.type, 'sale'),
        sql`coalesce(${transactions.metadata}->>'source', '') <> 'producer_course_sale'`,
      ),
      eq(transactions.type, 'refund'),
    ),
  )
}

@Injectable()
export class StudentFinanceService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(userId: string, query: StudentTransactionsQuery): Promise<StudentTransaction[]> {
    const year = query.year && query.year !== 'all' ? Number(query.year) : null
    const rows = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          studentScope(userId),
          year ? gte(transactions.createdAt, new Date(Date.UTC(year, 0, 1))) : undefined,
          year ? lt(transactions.createdAt, new Date(Date.UTC(year + 1, 0, 1))) : undefined,
          query.status && query.status !== 'all'
            ? eq(transactions.status, query.status)
            : undefined,
        ),
      )
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(500)

    const mapped = await this.toStudentTransactions(rows)
    if (!query.searchTerm) return mapped
    const term = query.searchTerm.toLowerCase()
    return mapped.filter(
      (row) =>
        row.course_title.toLowerCase().includes(term) ||
        row.id.toLowerCase().includes(term) ||
        row.producer_name.toLowerCase().includes(term),
    )
  }

  async stats(userId: string): Promise<StudentFinancialStats> {
    const sales = await this.db
      .select({
        amount: transactions.amount,
        paymentMethod: transactions.paymentMethod,
        createdAt: transactions.createdAt,
        courseId: transactions.courseId,
        metadata: transactions.metadata,
      })
      .from(transactions)
      .where(
        and(
          studentScope(userId),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
        ),
      )
      .orderBy(desc(transactions.createdAt))
      .limit(5000)

    const refunds = await this.db
      .select({ amount: transactions.amount })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(
            and(eq(transactions.type, 'refund'), eq(transactions.status, 'completed')),
            and(
              eq(transactions.type, 'sale'),
              eq(transactions.status, 'refunded'),
              sql`coalesce(${transactions.metadata}->>'source', '') <> 'producer_course_sale'`,
            ),
          ),
        ),
      )

    const spentCents = sales.reduce((sum, row) => sum + dbToCents(row.amount), 0)
    const refundedCents = refunds.reduce((sum, row) => sum + dbToCents(row.amount), 0)
    // "Cursos adquiridos": cada transação de compra pode ter vários cursos.
    const courseCount = sales.reduce((sum, row) => sum + Math.max(1, courseIdsOf(row).length), 0)
    const last = sales[0]

    return {
      total_spent: spentCents / 100,
      total_refunded: refundedCents / 100,
      total_courses_purchased: courseCount,
      average_course_price: courseCount > 0 ? Math.round(spentCents / courseCount) / 100 : 0,
      last_purchase_date: last?.createdAt.toISOString() ?? null,
      primary_payment_method: last?.paymentMethod ?? null,
    }
  }

  /**
   * Comprovante de uma compra concluída DESTA pessoa. Gera (uma vez) o registro em `invoices` e
   * devolve o HTML. Compra de outra pessoa ou inexistente: mesma resposta (404).
   */
  async getInvoice(userId: string, transactionId: number) {
    const [transaction] = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          studentScope(userId),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
        ),
      )
    if (!transaction) throw new NotFoundException('Transação não encontrada')

    const amountCents = dbToCents(transaction.amount)
    const taxCents = Math.round((amountCents * INVOICE_TAX_RATE) / 100)
    // Número determinístico por transação: gerar de novo nunca cria um segundo comprovante.
    const stamp = transaction.createdAt.toISOString().slice(0, 10).replaceAll('-', '')
    const invoiceNumber = `NF-${stamp}-${String(transaction.id).padStart(8, '0')}`

    await this.db
      .insert(invoices)
      .values({
        transactionId: transaction.id,
        invoiceNumber,
        amount: amountCents / 100,
        taxAmount: taxCents / 100,
        totalAmount: amountCents / 100,
        status: 'paid',
        paidAt: transaction.createdAt,
        pdfUrl: `/api/finance/student/transactions/${transaction.id}/invoice`,
      })
      .onConflictDoNothing({ target: invoices.invoiceNumber })
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.transactionId, transaction.id))
      .orderBy(invoices.id)
      .limit(1)

    const [[profile], settings, items] = await Promise.all([
      this.db
        .select({ fullName: profiles.fullName, cpf: profiles.cpf })
        .from(profiles)
        .where(eq(profiles.id, userId)),
      this.readSettings(),
      this.toStudentTransactions([transaction]),
    ])

    const itemCents = amountCents
    const data: InvoiceData = {
      invoiceNumber: invoice?.invoiceNumber ?? invoiceNumber,
      issueDate: invoice?.issuedAt ?? new Date(),
      transactionId: transaction.id,
      customer: { name: profile?.fullName ?? 'Cliente', cpf: profile?.cpf ?? 'Não informado' },
      items: [
        {
          description: items[0]?.course_title ?? 'Cursos',
          quantity: 1,
          unitPrice: itemCents / 100,
          total: itemCents / 100,
        },
      ],
      subtotal: amountCents / 100,
      taxes: taxCents / 100,
      taxRate: INVOICE_TAX_RATE,
      total: amountCents / 100,
      paymentMethod: transaction.paymentMethod ?? 'Não informado',
      paidAt: transaction.createdAt,
      ...settings,
    }
    return {
      invoiceNumber: data.invoiceNumber,
      filename: `comprovante-${data.invoiceNumber}.html`,
      html: renderInvoiceHtml(data),
    }
  }

  /**
   * Pede reembolso de uma compra. Só registra o pedido (`refund` pendente) para o financeiro
   * tratar: nada é estornado nem o acesso muda aqui. Só uma venda (`sale`) do próprio aluno pode
   * ser reembolsada.
   */
  async requestRefund(userId: string, input: RefundRequestInput) {
    const [original] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, input.transactionId), studentScope(userId)))
    if (!original) throw new NotFoundException('Transação não encontrada')
    if (original.type !== 'sale') {
      throw new BadRequestException('Apenas compras podem ser reembolsadas')
    }
    if (original.status !== 'completed') {
      throw new BadRequestException('Apenas transações concluídas podem ser reembolsadas')
    }
    const days = Math.floor((Date.now() - original.createdAt.getTime()) / 86_400_000)
    if (days > REFUND_WINDOW_DAYS) {
      throw new BadRequestException(`Prazo para reembolso expirado (${REFUND_WINDOW_DAYS} dias)`)
    }

    return this.db.transaction(async (tx) => {
      // Um pedido de reembolso por compra, mesmo com cliques simultâneos.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`refund:${original.id}`}))`)
      const [existing] = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'refund'),
            sql`${transactions.metadata}->>'original_transaction_id' = ${String(original.id)}`,
          ),
        )
      if (existing) throw new ConflictException('Reembolso já solicitado para esta compra')

      const [created] = await tx
        .insert(transactions)
        .values({
          userId,
          type: 'refund',
          amount: original.amount,
          status: 'pending',
          courseId: original.courseId ?? courseIdsOf(original)[0] ?? null,
          paymentMethod: 'refund',
          metadata: {
            original_transaction_id: original.id,
            reason: input.reason,
            requested_at: new Date().toISOString(),
          },
        })
        .returning({ id: transactions.id })
      return { id: String(created!.id) }
    })
  }

  /** Dados de exibição das linhas: título/capa do(s) curso(s) e nome do produtor. */
  private async toStudentTransactions(rows: TransactionRow[]): Promise<StudentTransaction[]> {
    // Reembolso aponta para a compra original, que é quem sabe os cursos.
    const originalIds = rows.flatMap((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {}
      return row.type === 'refund' && Number.isInteger(Number(metadata.original_transaction_id))
        ? [Number(metadata.original_transaction_id)]
        : []
    })
    const originals =
      originalIds.length > 0
        ? await this.db.select().from(transactions).where(inArray(transactions.id, originalIds))
        : []
    const originalById = new Map(originals.map((row) => [row.id, row]))

    const courseIdsByRow = new Map(
      rows.map((row) => {
        const metadata = isRecord(row.metadata) ? row.metadata : {}
        const original =
          row.type === 'refund' ? originalById.get(Number(metadata.original_transaction_id)) : null
        const own = courseIdsOf(row)
        return [row.id, own.length > 0 ? own : original ? courseIdsOf(original) : []] as const
      }),
    )
    const allCourseIds = [...new Set([...courseIdsByRow.values()].flat())]
    const courseRows =
      allCourseIds.length > 0
        ? await this.db
            .select({
              id: courses.id,
              title: courses.title,
              thumbnailUrl: courses.thumbnailUrl,
              producerName: sql<
                string | null
              >`(select coalesce(p.display_name, p.full_name) from profiles p where p.id = ${courses.producerId})`,
            })
            .from(courses)
            .where(inArray(courses.id, allCourseIds))
        : []
    const courseById = new Map(courseRows.map((row) => [row.id, row]))

    return rows.map((row) => {
      const found = (courseIdsByRow.get(row.id) ?? []).flatMap((id) => {
        const course = courseById.get(id)
        return course ? [course] : []
      })
      const producers = [
        ...new Set(found.flatMap((course) => (course.producerName ? [course.producerName] : []))),
      ]
      return {
        id: String(row.id),
        amount: row.amount,
        type: row.type === 'sale' ? ('purchase' as const) : ('refund' as const),
        status: row.status,
        payment_method: row.paymentMethod || 'Não informado',
        course_id: found[0] ? String(found[0].id) : '',
        course_title:
          found.length > 0
            ? found.map((course) => course.title).join(', ')
            : 'Curso não encontrado',
        course_thumbnail: found[0]?.thumbnailUrl ?? null,
        producer_name: producers.length > 0 ? producers.join(', ') : 'Produtor desconhecido',
        created_at: row.createdAt.toISOString(),
      }
    })
  }

  private async readSettings() {
    const rows = await this.db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(
        inArray(platformSettings.key, [
          'site_name',
          'support_email',
          'legal_company_name',
          'legal_company_document',
        ]),
      )
    const byKey = new Map(rows.map((row) => [row.key, row.value]))
    const text = (key: string, fallback: string) => {
      const value = byKey.get(key)
      return typeof value === 'string' && value.trim() ? value.trim() : fallback
    }
    return {
      platformName: text('site_name', 'Escola do Garoto;'),
      supportEmail: text('support_email', 'contato@exemplo.com.br'),
      companyName: text('legal_company_name', 'Escola do Garoto;'),
      companyDocument: text('legal_company_document', '00.000.000/0001-00'),
    }
  }
}
