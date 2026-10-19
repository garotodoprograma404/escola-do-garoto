import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { checkoutOrders, enrollments, paymentEvents } from '../../database/schema/index.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import {
  PaymentGateway,
  PaymentGatewayError,
  PaymentsNotConfiguredError,
  type GatewayPayment,
} from './gateway/payment-gateway.js'
import { CouponsService } from './coupons.service.js'
import { dbToCents } from './money.js'
import {
  fulfillOrder,
  loadItems,
  metadataOf,
  normalizePaymentMethod,
  revokeOrderAccess,
  type OrderRow,
} from './order-fulfillment.js'
import {
  isPaidStatus,
  nextOrderStatus,
  outcomeOfPaymentStatus,
  type OrderStatus,
} from './order-transition.js'

export type PaymentSource = 'webhook' | 'sync' | 'simulator' | 'refund'

/** `refunded`: estorno confirmado e aplicado. `awaiting_confirmation`: pedido, o webhook conclui. */
export type RefundOrderResult = 'refunded' | 'awaiting_confirmation'

const REFUNDED_STATUSES = new Set(['refunded', 'charged_back'])

export type ApplyOutcome =
  | 'applied' // o pedido mudou de estado
  | 'ignored' // nada a fazer (reentrega, evento antigo, status que não muda o pedido)
  | 'amount_mismatch' // valor/moeda não batem com o pedido: NÃO libera nada
  | 'unknown_order' // referência não é de nenhum pedido nosso
  | 'duplicate_payment' // outro pagamento aprovado para um pedido já pago (estorno manual)
  | 'refund_of_other_payment' // estorno de um pagamento que não é o que liquidou o pedido
  | 'awaiting_account' // pago, mas o pedido ainda não tem conta de aluno

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Único lugar do sistema onde um pagamento muda um pedido. Webhook, sincronização da tela de
 * resultado e simulador de desenvolvimento passam TODOS por `applyPayment`: as conferências e a
 * máquina de estados existem uma vez só.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CouponsService) private readonly couponsService: CouponsService,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  /**
   * Estorno TOTAL do pagamento que liquidou o pedido (reembolso aprovado pelo admin).
   *
   * - Compra feita no simulador (`fake-…`, desenvolvimento e demonstração): o estorno é simulado e
   *   aplicado na hora, pelo mesmo `applyPayment`.
   * - Mercado Pago: pede o estorno pela API (com chave de idempotência) e reconsulta o pagamento. Se
   *   ele já consta como estornado, aplica; se não, o webhook conclui quando o Mercado Pago confirmar.
   *
   * O pedido só muda por `applyPayment`: o que tira o acesso e as comissões é o pagamento estornado.
   * `requestKey` identifica o pedido de reembolso; a chave enviada ao gateway leva também o id do
   * pagamento (banco recriado ou outro ambiente na mesma conta nunca reaproveitam um estorno antigo).
   */
  async refundOrder(orderId: number, requestKey: string): Promise<RefundOrderResult> {
    const order = await this.loadRefundableOrder(orderId)
    if (order.status === 'refunded') return 'refunded'
    const paymentId = order.paymentId!

    if (paymentId.startsWith('fake-')) {
      await this.applyPayment(
        {
          id: paymentId,
          status: 'refunded',
          statusDetail: 'simulated',
          amountCents: dbToCents(order.totalAmount),
          currency: 'BRL',
          externalReference: order.externalReference,
          paymentTypeId: null,
          lastUpdated: new Date().toISOString(),
        },
        'simulator',
      )
      return (await this.loadRefundableOrder(orderId)).status === 'refunded'
        ? 'refunded'
        : 'awaiting_confirmation'
    }

    try {
      await this.gateway.refundPayment({
        paymentId,
        idempotencyKey: `${requestKey}:${paymentId}`,
      })
    } catch (error) {
      // Já estornado (ex.: pelo painel do Mercado Pago): segue para aplicar. Senão, avisa o admin.
      const current = await this.gateway.getPayment(paymentId).catch(() => null)
      if (!current || !REFUNDED_STATUSES.has(current.status)) throw this.refundError(error)
    }

    const payment = await this.gateway.getPayment(paymentId).catch(() => null)
    if (payment && REFUNDED_STATUSES.has(payment.status)) {
      await this.applyPayment(payment, 'refund')
    }
    return (await this.loadRefundableOrder(orderId)).status === 'refunded'
      ? 'refunded'
      : 'awaiting_confirmation'
  }

  /** Confere, sem mexer em nada, se o pedido pode ser estornado (lança o motivo se não puder). */
  async assertRefundable(orderId: number): Promise<void> {
    const order = await this.loadRefundableOrder(orderId)
    if (order.status === 'refunded') throw new BadRequestException('Este pedido já foi estornado')
  }

  private async loadRefundableOrder(orderId: number) {
    const [order] = await this.db
      .select({
        status: checkoutOrders.status,
        paymentId: checkoutOrders.paymentId,
        externalReference: checkoutOrders.externalReference,
        totalAmount: checkoutOrders.totalAmount,
      })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.id, orderId))
    if (!order) throw new NotFoundException('Pedido não encontrado')
    if (order.status === 'refunded') return order
    if (order.status !== 'approved') {
      throw new BadRequestException('Só um pedido pago pode ser estornado')
    }
    if (!order.paymentId || !/^(fake-[\w-]+|\d{1,20})$/.test(order.paymentId)) {
      throw new BadRequestException(
        'Esta compra não tem pagamento no Mercado Pago para estornar. Devolva o valor por fora e recuse o pedido explicando.',
      )
    }
    // Compra do simulador fora do modo simulador (ex.: banco que veio da demonstração): não houve
    // dinheiro, então nada é "estornado" nem o aluno é avisado de uma devolução que não existe.
    if (order.paymentId.startsWith('fake-') && !(await this.gateway.simulatesPayments())) {
      throw new BadRequestException(
        'Esta compra foi feita no simulador de pagamento: não houve cobrança para estornar. Recuse o pedido explicando.',
      )
    }
    return order
  }

  /** Erro do gateway para o admin, sem detalhe técnico (nunca token nem dado do pagador). */
  private refundError(error: unknown) {
    if (error instanceof PaymentsNotConfiguredError) {
      return new ServiceUnavailableException(
        'O Mercado Pago não está configurado. Conecte a conta em Configurações → Financeiro.',
      )
    }
    if (error instanceof PaymentGatewayError) {
      this.logger.warn(`Estorno recusado pelo gateway: ${error.message}`)
      return new BadGatewayException(
        error.httpStatus === 409
          ? error.message
          : 'O Mercado Pago não aceitou o estorno agora. Confira o saldo da conta e tente de novo.',
      )
    }
    return error
  }

  /**
   * Aplica ao pedido o estado de um pagamento JÁ CONSULTADO no gateway (nunca o corpo cru de uma
   * notificação). Idempotente: reentregas e eventos fora de ordem não duplicam matrícula nem
   * transação, e não mudam um pedido que já está num estado final.
   *
   * Conferências de segurança: o que foi PAGO precisa ser o que foi COBRADO
   * (moeda + valor em centavos) e o pagamento precisa apontar para um pedido nosso.
   */
  async applyPayment(payment: GatewayPayment, source: PaymentSource): Promise<ApplyOutcome> {
    const eventKey = `payment:${payment.id}:${payment.status}:${payment.lastUpdated ?? 'na'}`

    if (!payment.externalReference || !UUID.test(payment.externalReference)) {
      await this.recordEvent(this.db, { eventKey, payment, source, outcome: 'unknown_order' })
      return 'unknown_order'
    }
    const reference = payment.externalReference.toLowerCase()

    const closeAfterCommit: string[] = []
    const result = await this.db.transaction(async (tx) => {
      // Trava a linha do pedido: dois eventos do mesmo pagamento chegando juntos são processados
      // um depois do outro, e o segundo já enxerga o resultado do primeiro.
      // Ordem de travas: cupom primeiro, pedido depois (ver `CouponsService.lockById`).
      const [peek] = await tx
        .select({ couponId: checkoutOrders.couponId })
        .from(checkoutOrders)
        .where(eq(checkoutOrders.externalReference, reference))
      await this.couponsService.lockById(tx, peek?.couponId)
      const [order] = await tx
        .select()
        .from(checkoutOrders)
        .where(eq(checkoutOrders.externalReference, reference))
        .for('update')
      if (!order) {
        await this.recordEvent(tx, { eventKey, payment, source, outcome: 'unknown_order' })
        return 'unknown_order' as const
      }

      const outcome = outcomeOfPaymentStatus(payment.status)
      const isOrdersPayment = order.paymentId === payment.id
      const record = (result: ApplyOutcome, extra: Partial<RecordInput> = {}) =>
        this.recordEvent(tx, { eventKey, payment, source, outcome: result, order, ...extra })

      if (outcome === 'paid') {
        if (payment.currency !== 'BRL' || payment.amountCents !== dbToCents(order.totalAmount)) {
          await record('amount_mismatch')
          this.logger.warn(`Pagamento ${payment.id} com valor divergente do pedido ${order.id}`)
          return 'amount_mismatch' as const
        }
        // Já pago por OUTRO pagamento: a pessoa pagou duas vezes. Não mexe; sinaliza para estorno.
        if (isPaidStatus(order.status) && order.paymentId && !isOrdersPayment) {
          await record('duplicate_payment')
          this.logger.warn(`Pagamento duplicado ${payment.id} no pedido ${order.id}`)
          return 'duplicate_payment' as const
        }
      }

      // Estorno de OUTRO pagamento (ex.: o duplicado): o pedido pago por outro continua pago.
      if (outcome === 'refunded' && order.status === 'approved' && !isOrdersPayment) {
        await record('refund_of_other_payment')
        return 'refund_of_other_payment' as const
      }

      const next = nextOrderStatus(order.status as OrderStatus, outcome, isOrdersPayment)
      if (next === null) {
        // Pedido que continua aguardando: só guarda o que o gateway disse.
        if (
          (outcome === 'pending' || outcome === 'in_process') &&
          (order.status === 'pending' || order.status === 'in_process')
        ) {
          await tx
            .update(checkoutOrders)
            .set({ providerStatus: payment.status })
            .where(eq(checkoutOrders.id, order.id))
        }
        await record('ignored')
        return 'ignored' as const
      }

      const result = await this.transition(tx, order, next, payment, source, closeAfterCommit)
      await record(result, { from: order.status, to: next })
      return result
    })

    // Pedido cancelado devolveu o cupom: o link não pode mais ser pago (senão o cupom voltaria a valer
    // para outra pessoa e esta ainda pagaria o desconto).
    for (const preferenceId of closeAfterCommit) {
      try {
        await this.gateway.closeCheckout(preferenceId)
      } catch (error) {
        this.logger.warn(
          `Não foi possível encerrar o link ${preferenceId}: ${error instanceof Error ? error.message : 'erro'}`,
        )
      }
    }
    return result
  }

  private async transition(
    tx: DbExecutor,
    order: OrderRow,
    next: OrderStatus,
    payment: GatewayPayment,
    source: PaymentSource,
    closeAfterCommit: string[],
  ): Promise<ApplyOutcome> {
    const paymentMethod = normalizePaymentMethod(payment.paymentTypeId)
    const metadata = metadataOf(order)

    if (next === 'approved') {
      if (!order.userId) {
        // Pedido sem conta de aluno: o pagamento é registrado, e a matrícula sai quando a conta
        // for criada (ver `FinalizeAccountService`).
        await tx
          .update(checkoutOrders)
          .set({
            status: 'approved',
            providerStatus: payment.status,
            paymentId: payment.id,
            requestedPaymentMethod: paymentMethod,
            paidAt: order.paidAt ?? new Date(),
            metadata: { ...metadata, awaiting_account: true },
          })
          .where(eq(checkoutOrders.id, order.id))
        return 'awaiting_account'
      }

      // Pagou por um acesso que a pessoa já tinha (outro pedido ou matrícula manual): o pedido é
      // liberado mesmo assim, mas fica sinalizado para estorno. A matrícula existente não muda.
      const items = await loadItems(tx, order.id)
      const owned = await tx
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, order.userId),
            inArray(
              enrollments.courseId,
              items.map((item) => item.courseId),
            ),
            inArray(enrollments.status, ['active', 'completed']),
          ),
        )
      if (owned.length > 0) {
        await this.recordEvent(tx, {
          eventKey: `payment:${payment.id}:${payment.status}:duplicate_purchase`,
          payment,
          source,
          outcome: 'applied',
          order,
          action: 'duplicate_purchase',
          extraPayload: { courseIds: owned.map((row) => row.courseId) },
        })
        this.logger.warn(`Compra duplicada no pedido ${order.id}: curso(s) já eram da pessoa`)
      }
      if (metadata.coupon_reservation === 'released') {
        await this.recordEvent(tx, {
          eventKey: `payment:${payment.id}:${payment.status}:coupon_reactivated`,
          payment,
          source,
          outcome: 'applied',
          order,
          action: 'coupon_reactivated',
          extraPayload: { couponId: order.couponId },
        })
      }

      const fulfilled = await fulfillOrder(tx, order, {
        paymentId: payment.id,
        paymentMethod,
        providerStatus: payment.status,
        source: source === 'webhook' ? 'mercadopago_webhook' : 'checkout_success_reconciliation',
        free: false,
      })
      if (fulfilled.couponOveruse) {
        // O cupom já tinha voltado para a fila e esta compra ultrapassa o limite (ou a pessoa já o
        // usou): o dinheiro entrou e o acesso sai, mas o financeiro precisa revisar.
        await this.recordEvent(tx, {
          eventKey: `payment:${payment.id}:${payment.status}:coupon_overuse`,
          payment,
          source,
          outcome: 'applied',
          order,
          action: 'coupon_overuse',
          extraPayload: { couponId: order.couponId },
        })
        this.logger.warn(`Cupom usado além do limite no pedido ${order.id}`)
      }
      return 'applied'
    }

    const common = {
      status: next,
      providerStatus: payment.status,
      paymentId: payment.id,
      requestedPaymentMethod: payment.paymentTypeId ? paymentMethod : order.requestedPaymentMethod,
    }

    if (next === 'refunded') {
      // Estorno/chargeback: o acesso dado por esta compra acaba (e o certificado dela).
      const { revokedCourseIds } = await revokeOrderAccess(tx, order)
      await tx
        .update(checkoutOrders)
        .set({ ...common, metadata: { ...metadata, refunded_at: new Date().toISOString() } })
        .where(eq(checkoutOrders.id, order.id))
      if (order.userId) {
        await this.notifications.create(
          {
            userId: order.userId,
            type: payment.status === 'charged_back' ? 'order_charged_back' : 'order_refunded',
            title: 'Compra estornada',
            message:
              revokedCourseIds.length > 0
                ? 'O valor da compra foi estornado e volta pelo mesmo meio de pagamento. O acesso ao curso foi encerrado.'
                : 'O valor da compra foi estornado e volta pelo mesmo meio de pagamento.',
            link: '/student/financials',
            metadata: { orderId: order.publicId },
          },
          tx,
        )
      }
      return 'applied'
    }

    // Recusa (`failed`) NÃO devolve o cupom: o Mercado Pago deixa pagar por outro meio no mesmo link,
    // então o pedido continua segurando a reserva até ser substituído ou expirar (aí o link é encerrado).
    // Já o cancelamento devolve o cupom e encerra o link.
    let nextMetadata = metadata
    if (next === 'cancelled' && order.couponId) {
      nextMetadata = await this.releaseCoupon(tx, order, metadata)
      if (order.preferenceId) closeAfterCommit.push(order.preferenceId)
    }
    await tx
      .update(checkoutOrders)
      .set({ ...common, metadata: nextMetadata })
      .where(eq(checkoutOrders.id, order.id))
    return 'applied'
  }

  /** Devolve a reserva do cupom do pedido (uma vez só) e devolve o metadata atualizado. */
  async releaseCoupon(
    tx: DbExecutor,
    order: Pick<OrderRow, 'couponId'>,
    metadata: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!order.couponId || metadata.coupon_reservation !== 'reserved') return metadata
    await this.couponsService.release(tx, order.couponId)
    return { ...metadata, coupon_reservation: 'released' }
  }

  /** Auditoria. Só campos permitidos do pagamento: nada de dados do pagador. */
  private async recordEvent(executor: DbExecutor, input: RecordInput) {
    await executor
      .insert(paymentEvents)
      .values({
        provider: 'mercadopago',
        eventKey: input.eventKey,
        eventType: 'payment',
        resourceId: input.payment.id,
        action: input.action ?? input.outcome,
        orderId: input.order?.id ?? null,
        processed: true,
        processedAt: new Date(),
        errorMessage:
          input.outcome === 'amount_mismatch' ? 'Valor ou moeda diferentes do pedido' : null,
        payload: {
          source: input.source,
          status: input.payment.status,
          statusDetail: input.payment.statusDetail,
          amountCents: input.payment.amountCents,
          currency: input.payment.currency,
          paymentTypeId: input.payment.paymentTypeId,
          from: input.from ?? null,
          to: input.to ?? null,
          ...input.extraPayload,
        },
      })
      .onConflictDoNothing({ target: [paymentEvents.provider, paymentEvents.eventKey] })
  }
}

type RecordInput = {
  eventKey: string
  payment: GatewayPayment
  source: PaymentSource
  outcome: ApplyOutcome
  order?: OrderRow
  /** Rótulo gravado em `payment_events.action` (padrão: o próprio resultado). */
  action?: string
  from?: string
  to?: string
  extraPayload?: Record<string, unknown>
}
