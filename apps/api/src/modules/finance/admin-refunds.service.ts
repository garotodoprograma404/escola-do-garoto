import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  checkoutOrders,
  courses,
  profiles,
  transactions,
  users,
} from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { PaymentsService } from '../checkout/payments.service.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import type { RefundFilters } from './finance.schemas.js'
import { refundMetadataOf, refundStageOf, type RefundStage } from './refund-request.js'
import { courseIdsOf } from './student-finance.service.js'

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

export type AdminRefundRequest = {
  id: string
  amount: number
  stage: RefundStage
  reason: string | null
  rejection_reason: string | null
  requested_at: string
  decided_at: string | null
  student: { id: string; name: string; email: string }
  purchase: {
    transaction_id: string | null
    purchased_at: string | null
    payment_method: string | null
    course_titles: string
  }
  order_public_id: string | null
  /** Por onde o dinheiro volta: Mercado Pago (API), simulador (demonstração) ou fora do sistema. */
  gateway: 'mercadopago' | 'simulator' | 'manual'
}

export type ApproveRefundResult = {
  refund: AdminRefundRequest
  /** `refunded`: estorno confirmado na hora. `awaiting_confirmation`: o webhook conclui. */
  result: 'refunded' | 'awaiting_confirmation'
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Fila de pedidos de reembolso do ADMIN. Aprovar pede o estorno ao gateway (o que tira o acesso,
 * o certificado e as comissões é o pagamento estornado, por `PaymentsService.applyPayment`);
 * recusar encerra o pedido com motivo. O aluno é avisado no sino nos dois casos.
 */
@Injectable()
export class AdminRefundsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(filters: RefundFilters): Promise<AdminRefundRequest[]> {
    const rows = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'refund'))
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(300)
    const mapped = await this.map(rows)
    const visible =
      filters.status === 'all'
        ? mapped
        : filters.status === 'open'
          ? mapped.filter((row) => row.stage === 'requested' || row.stage === 'approved')
          : mapped.filter((row) => row.stage === filters.status)
    // Os que pedem ação primeiro.
    return visible.sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)))
  }

  /**
   * Aprova e pede o estorno. Pode ser repetido enquanto o gateway não confirmar (mesma chave de
   * idempotência: o Mercado Pago não estorna duas vezes).
   */
  async approve(adminId: string, id: number, request: RequestInfo): Promise<ApproveRefundResult> {
    const { orderId, refund } = await this.loadOpen(id)
    if (orderId === null) {
      throw new BadRequestException(
        'Esta compra não está ligada a um pedido do checkout. Devolva o valor por fora e recuse o pedido explicando.',
      )
    }
    const firstApproval = refundStageOf(refund) === 'requested'
    if (firstApproval) {
      // Antes de marcar como aprovado: compra sem pagamento estornável não muda de estado.
      await this.payments.assertRefundable(orderId)
      await this.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(transactions)
          .set({
            metadata: sql`coalesce(${transactions.metadata}, '{}'::jsonb) || ${JSON.stringify({
              approved_at: new Date().toISOString(),
              approved_by: adminId,
            })}::jsonb`,
          })
          .where(
            and(
              eq(transactions.id, id),
              eq(transactions.type, 'refund'),
              eq(transactions.status, 'pending'),
              sql`not (coalesce(${transactions.metadata}, '{}'::jsonb) ? 'approved_at')`,
            ),
          )
          .returning({ id: transactions.id })
        if (!updated) throw new ConflictException('Este pedido de reembolso já foi decidido.')
        await this.audit.log(
          {
            userId: adminId,
            action: 'approve',
            resourceType: 'refund_request',
            resourceId: id,
            changes: { from: 'requested', to: 'approved' },
            metadata: { amount: refund.amount, orderId },
            ipAddress: request.ipAddress ?? null,
            userAgent: request.userAgent ?? null,
          },
          tx,
        )
      })
    }

    const result = await this.payments.refundOrder(orderId, `refund-request-${id}`)
    // Só na primeira aprovação: tentar de novo não manda outro aviso igual.
    if (result === 'awaiting_confirmation' && firstApproval) {
      await this.notifications.create({
        userId: refund.userId,
        type: 'refund_approved',
        title: 'Reembolso aprovado',
        message: `Seu reembolso de ${brl.format(refund.amount)} foi aprovado. O estorno está sendo processado pelo meio de pagamento.`,
        link: '/student/financials',
        metadata: { refundId: id },
      })
    }
    return { refund: await this.get(id), result }
  }

  /**
   * Recusa o pedido. Também serve para encerrar um pedido APROVADO cujo estorno não vai acontecer
   * (o gateway recusou de vez e o valor foi devolvido por fora), desde que a compra não tenha sido
   * estornada: aí o pedido já está concluído.
   */
  async reject(
    adminId: string,
    id: number,
    reason: string,
    request: RequestInfo,
  ): Promise<AdminRefundRequest> {
    const { orderId, refund } = await this.loadOpen(id)
    const from = refundStageOf(refund)
    await this.db.transaction(async (tx) => {
      // Trava o pedido de compra: um estorno chegando agora (webhook) espera esta decisão, e uma
      // compra já estornada não deixa recusar.
      const [order] =
        orderId === null
          ? []
          : await tx
              .select({ status: checkoutOrders.status })
              .from(checkoutOrders)
              .where(eq(checkoutOrders.id, orderId))
              .for('update')
      if (order?.status === 'refunded') {
        throw new ConflictException('Esta compra já foi estornada: o reembolso está concluído.')
      }
      const [row] = await tx
        .update(transactions)
        .set({
          status: 'failed',
          metadata: sql`coalesce(${transactions.metadata}, '{}'::jsonb) || ${JSON.stringify({
            closed_reason: 'rejected',
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
            rejected_by: adminId,
          })}::jsonb`,
        })
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.type, 'refund'),
            eq(transactions.status, 'pending'),
          ),
        )
        .returning({ userId: transactions.userId, amount: transactions.amount })
      if (!row) throw new ConflictException('Este pedido de reembolso já foi decidido.')
      await this.audit.log(
        {
          userId: adminId,
          action: 'reject',
          resourceType: 'refund_request',
          resourceId: id,
          changes: { from, to: 'rejected' },
          metadata: { amount: row.amount, reason },
          ipAddress: request.ipAddress ?? null,
          userAgent: request.userAgent ?? null,
        },
        tx,
      )
      await this.notifications.create(
        {
          userId: row.userId,
          type: 'refund_rejected',
          title: 'Reembolso recusado',
          message: `Seu pedido de reembolso de ${brl.format(row.amount)} foi recusado. Motivo: ${reason}`,
          link: '/student/financials',
          metadata: { refundId: id },
        },
        tx,
      )
    })
    return this.get(id)
  }

  private async get(id: number): Promise<AdminRefundRequest> {
    const rows = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.type, 'refund')))
    const [mapped] = await this.map(rows)
    if (!mapped) throw new NotFoundException('Pedido de reembolso não encontrado')
    return mapped
  }

  /** Pedido ainda em aberto (pedido ou aprovado sem confirmação) e o pedido de compra dele (se há). */
  private async loadOpen(id: number) {
    const [refund] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.type, 'refund')))
    if (!refund) throw new NotFoundException('Pedido de reembolso não encontrado')
    const stage = refundStageOf(refund)
    if (stage === 'completed') throw new ConflictException('Este reembolso já foi concluído.')
    if (stage === 'rejected') throw new ConflictException('Este reembolso já foi recusado.')

    const originalId = Number(refundMetadataOf(refund).original_transaction_id)
    const [original] = Number.isSafeInteger(originalId)
      ? await this.db
          .select({ metadata: transactions.metadata })
          .from(transactions)
          .where(and(eq(transactions.id, originalId), eq(transactions.userId, refund.userId)))
      : []
    const orderId = Number(original ? refundMetadataOf(original).order_id : NaN)
    return { refund, orderId: Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null }
  }

  private async map(rows: (typeof transactions.$inferSelect)[]): Promise<AdminRefundRequest[]> {
    if (rows.length === 0) return []
    const originalIds = rows.flatMap((row) => {
      const id = Number(refundMetadataOf(row).original_transaction_id)
      return Number.isSafeInteger(id) && id > 0 ? [id] : []
    })
    const userIds = [...new Set(rows.map((row) => row.userId))]
    const [originals, people] = await Promise.all([
      originalIds.length > 0
        ? this.db.select().from(transactions).where(inArray(transactions.id, originalIds))
        : [],
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
    ])
    const originalById = new Map(originals.map((row) => [row.id, row]))
    const personById = new Map(people.map((row) => [row.id, row]))

    const orderIds = originals.flatMap((row) => {
      const id = Number(refundMetadataOf(row).order_id)
      return Number.isSafeInteger(id) && id > 0 ? [id] : []
    })
    const courseIds = [...new Set(originals.flatMap((row) => courseIdsOf(row)))]
    const [orders, courseRows] = await Promise.all([
      orderIds.length > 0
        ? this.db
            .select({
              id: checkoutOrders.id,
              publicId: checkoutOrders.publicId,
              paymentId: checkoutOrders.paymentId,
            })
            .from(checkoutOrders)
            .where(inArray(checkoutOrders.id, orderIds))
        : [],
      courseIds.length > 0
        ? this.db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(inArray(courses.id, courseIds))
        : [],
    ])
    const orderById = new Map(orders.map((row) => [row.id, row]))
    const titleById = new Map(courseRows.map((row) => [row.id, row.title]))

    return rows.map((row) => {
      const metadata = refundMetadataOf(row)
      const original = originalById.get(Number(metadata.original_transaction_id))
      const order = original ? orderById.get(Number(refundMetadataOf(original).order_id)) : null
      const person = personById.get(row.userId)
      const titles = original
        ? courseIdsOf(original).flatMap((cid) => titleById.get(cid) ?? [])
        : []
      const decidedAt = [metadata.rejected_at, metadata.completed_at, metadata.approved_at].find(
        (value): value is string => typeof value === 'string',
      )
      return {
        id: String(row.id),
        amount: row.amount,
        stage: refundStageOf(row),
        reason: typeof metadata.reason === 'string' ? metadata.reason : null,
        rejection_reason:
          typeof metadata.rejection_reason === 'string' ? metadata.rejection_reason : null,
        requested_at: row.createdAt.toISOString(),
        decided_at: decidedAt ?? null,
        student: {
          id: row.userId,
          name: person?.displayName || person?.fullName || 'Aluno',
          email: person?.email ?? '',
        },
        purchase: {
          transaction_id: original ? String(original.id) : null,
          purchased_at: original?.createdAt.toISOString() ?? null,
          payment_method: original?.paymentMethod ?? null,
          course_titles: titles.length > 0 ? titles.join(', ') : 'Curso não encontrado',
        },
        order_public_id: order?.publicId ?? null,
        gateway: gatewayOf(order?.paymentId ?? null),
      }
    })
  }
}

function isOpen(row: AdminRefundRequest) {
  return row.stage === 'requested' || row.stage === 'approved'
}

function gatewayOf(paymentId: string | null): AdminRefundRequest['gateway'] {
  if (paymentId?.startsWith('fake-')) return 'simulator'
  if (paymentId && /^\d{1,20}$/.test(paymentId)) return 'mercadopago'
  return 'manual'
}
