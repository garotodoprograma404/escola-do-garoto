import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { SessionUser } from '@vox/contracts'
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { checkoutOrderItems, checkoutOrders, profiles } from '../../database/schema/index.js'
import { AffiliateAttributionService } from './affiliate-attribution.service.js'
import { CartPricingService, type PricedCart } from './cart-pricing.service.js'
import { ORDER_TTL_MS } from './checkout.constants.js'
import type { ApplyCouponInput, CreateOrderInput } from './checkout.schemas.js'
import { normalizeCommissionRate, splitAffiliate, splitRevenue } from './commission.js'
import { CouponsService } from './coupons.service.js'
import {
  PaymentGateway,
  PaymentGatewayError,
  PaymentsNotConfiguredError,
} from './gateway/payment-gateway.js'
import { centsToReais, dbToCents } from './money.js'
import { fulfillOrder, loadItems, metadataOf, type OrderRow } from './order-fulfillment.js'
import { HOLDING_ORDER_STATUSES, OPEN_ORDER_STATUSES } from './order-transition.js'
import { toOrderView, type OrderView } from './order-view.js'
import { PaymentSettingsService } from './payment-settings.service.js'
import { PaymentsService } from './payments.service.js'

export type CreatedOrder = {
  order_id: string
  status: string
  redirect_url: string | null
  should_clear_cart: boolean
  message: string
}

export type CouponApplication = {
  success: boolean
  message: string
  discount: number
  subtotal: number
  final_total: number
  eligible_course_ids: number[]
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(CartPricingService) private readonly pricing: CartPricingService,
    @Inject(CouponsService) private readonly couponsService: CouponsService,
    @Inject(AffiliateAttributionService) private readonly affiliates: AffiliateAttributionService,
    @Inject(PaymentSettingsService) private readonly settings: PaymentSettingsService,
  ) {}

  /**
   * "Aplicar cupom" do carrinho: mostra o desconto sem criar nada nem reservar o cupom. É a mesma
   * conta do pedido; os preços vêm do banco (o cliente só diz quais cursos e qual cupom).
   */
  async applyCoupon(user: SessionUser, input: ApplyCouponInput): Promise<CouponApplication> {
    try {
      const priced = await this.pricing.priceCart(this.db, {
        userId: user.id,
        courseIds: input.courseIds,
        couponCode: input.code,
      })
      return {
        success: true,
        message: 'Cupom aplicado com sucesso!',
        discount: centsToReais(priced.discountCents),
        subtotal: centsToReais(priced.subtotalCents),
        final_total: centsToReais(priced.totalCents),
        eligible_course_ids: priced.eligibleCourseIds,
      }
    } catch (error) {
      // Cupom/carrinho recusado é um resultado esperado da tela, não um erro de servidor.
      if (error instanceof HttpException && error.getStatus() < 500) {
        return {
          success: false,
          message: error.message,
          discount: 0,
          subtotal: 0,
          final_total: 0,
          eligible_course_ids: [],
        }
      }
      throw error
    }
  }

  /**
   * Cria o pedido. O cliente manda só ids, cupom e método preferido; tudo o mais (preço, desconto,
   * taxa, total) é calculado aqui, dentro da transação. Total zero (curso grátis ou cupom de 100%)
   * já nasce pago e libera o acesso; os demais seguem para o checkout do Mercado Pago.
   */
  async createOrder(user: SessionUser, input: CreateOrderInput): Promise<CreatedOrder> {
    const paymentMethods = await this.settings.getPaymentOptions()
    const enabled = {
      pix: paymentMethods.pixEnabled,
      credit_card: paymentMethods.creditCardEnabled,
      boleto: paymentMethods.boletoEnabled,
    }
    if (!enabled[input.paymentMethod]) {
      throw new BadRequestException(
        'O método de pagamento selecionado não está disponível. Atualize a página e tente novamente.',
      )
    }

    // Antes de tudo, em transação própria e curta: pedidos vencidos DESTA pessoa e do cupom pedido
    // devolvem a reserva (sem depender do job de 10 em 10 minutos e sem varrer cupom de terceiros).
    const requestedCoupon = input.couponCode
      ? await this.couponsService.findByCode(this.db, input.couponCode)
      : undefined
    const expired = await this.db.transaction((tx) =>
      this.expireOverdue(tx, { userId: user.id, couponId: requestedCoupon?.id }),
    )
    await this.closeCheckouts(expired.preferenceIds)

    const created = await this.db.transaction(async (tx) => {
      // Uma criação de pedido por vez para a mesma pessoa: cliques duplos não geram dois pedidos
      // nem gastam o cupom duas vezes.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`checkout:${user.id}`}))`)

      // Trava TODOS os cupons envolvidos de uma vez, em ordem de id (nunca dois pedidos de pessoas
      // diferentes esperando um pelo cupom do outro): o pedido novo e os pedidos abertos da pessoa.
      const holding = await this.holdingOrders(tx, user.id)
      const couponIds = new Set<number>(
        holding.flatMap((order) => (order.couponId ? [order.couponId] : [])),
      )
      if (requestedCoupon) couponIds.add(requestedCoupon.id)
      for (const couponId of [...couponIds].sort((a, b) => a - b)) {
        await this.couponsService.lockById(tx, couponId)
      }

      const priced = await this.pricing.priceCart(tx, {
        userId: user.id,
        courseIds: input.courseIds,
        couponCode: input.couponCode,
        lockCoupon: true,
      })

      const open = holding.filter((order) =>
        (OPEN_ORDER_STATUSES as readonly string[]).includes(order.status),
      )
      const reusable = await this.findReusable(tx, open, priced)
      if (reusable) return { order: reusable, isNew: false, superseded: [] as string[] }

      // Pagamento em análise com este cupom: ainda pode ser aprovado, então não dá para reservar de novo.
      if (
        priced.coupon &&
        holding.some(
          (order) => order.status === 'in_process' && order.couponId === priced.coupon!.id,
        )
      ) {
        throw new BadRequestException(
          'Você já tem um pagamento em análise usando este cupom. Aguarde a confirmação.',
        )
      }

      // Pedido novo substitui os pendentes antigos que dividem curso ou cupom com ele: evita
      // cobrança duplicada e devolve a reserva do cupom antes de conferir o limite.
      const superseded = await this.supersedeConflicting(tx, holding, priced)

      let couponReserved = false
      if (priced.coupon) {
        // Relê o cupom: a substituição acima pode ter devolvido reservas (o `usage_count` mudou).
        const fresh = await this.couponsService.findByCode(tx, priced.coupon.code)
        await this.couponsService.assertAvailableForUser(tx, fresh ?? priced.coupon, user.id)
        couponReserved = await this.couponsService.reserve(tx, priced.coupon.id)
        if (!couponReserved) {
          throw new BadRequestException('Este cupom atingiu o limite de uso')
        }
      }

      const order = await this.insertOrder(tx, user, input, priced, couponReserved)
      if (order.totalAmount <= 0) {
        await fulfillOrder(tx, order, {
          paymentId: `FREE_${order.publicId}`,
          paymentMethod: 'free_coupon',
          providerStatus: 'free',
          source: 'checkout_action',
          free: true,
        })
      }
      return { order: await this.reload(tx, order.id), isNew: true, superseded }
    })
    // Os links dos pedidos substituídos deixam de aceitar pagamento (a reserva do cupom já voltou).
    await this.closeCheckouts(created.superseded)

    let order = created.order
    if (order.status === 'free_completed') {
      return {
        order_id: order.publicId,
        status: order.status,
        redirect_url: `/checkout/success?order_id=${order.publicId}`,
        should_clear_cart: true,
        message: 'Matrícula realizada com sucesso!',
      }
    }

    // Também vale para pedido reaproveitado: se o clique anterior ainda não terminou de abrir o
    // pagamento, este termina (a gravação do link é "primeiro a chegar vence").
    if (order.status === 'pending' && !order.checkoutUrl) {
      order = await this.openCheckout(order, user)
    }
    return {
      order_id: order.publicId,
      status: order.status,
      redirect_url: order.checkoutUrl,
      should_clear_cart: false,
      message: 'Redirecionando para o pagamento seguro...',
    }
  }

  /** Pedido DESTA pessoa. De outra pessoa ou inexistente: mesma resposta (não revela que existe). */
  async getOrder(userId: string, publicId: string): Promise<OrderView> {
    const order = await this.findOwned(this.db, userId, publicId)
    return toOrderView(order, await loadItems(this.db, order.id))
  }

  /**
   * Pedido SEM conta de aluno (compra feita sem cadastro), para a tela "finalizar conta". Só
   * responde por pedido que não tem dono: o id (impossível de adivinhar) é a credencial. Pedido
   * de alguém com conta responde igual a inexistente.
   */
  async getGuestOrder(publicId: string): Promise<OrderView> {
    const [order] = await this.db
      .select()
      .from(checkoutOrders)
      .where(
        and(
          eq(checkoutOrders.publicId, publicId),
          isNull(checkoutOrders.userId),
          // Só pedido marcado como "compra sem conta" (pedido de conta excluída não vaza por aqui).
          sql`jsonb_typeof(${checkoutOrders.metadata}->'pending_account') = 'object'`,
        ),
      )
    if (!order) throw new NotFoundException('Pedido não encontrado.')
    return toOrderView(order, await loadItems(this.db, order.id), { maskBuyerEmail: true })
  }

  /**
   * Para a tela de resultado: confere no Mercado Pago os pagamentos deste pedido e aplica (pelo
   * mesmo caminho do webhook). Cobre o intervalo entre o pagamento e a notificação chegar.
   */
  async syncOrder(userId: string, publicId: string): Promise<OrderView> {
    const order = await this.findOwned(this.db, userId, publicId)
    if (order.status === 'pending' || order.status === 'in_process') {
      try {
        const found = await this.gateway.findPaymentsByReference(order.externalReference)
        // Aprovado primeiro: se houve uma recusa e depois um pagamento aprovado, vale o aprovado.
        const sorted = [...found].sort(
          (a, b) => Number(b.status === 'approved') - Number(a.status === 'approved'),
        )
        for (const payment of sorted) await this.payments.applyPayment(payment, 'sync')
      } catch (error) {
        if (!(error instanceof PaymentGatewayError)) throw error
        // Gateway fora do ar: mostra o estado que temos; o webhook ainda pode resolver.
        this.logger.warn(`Sincronização do pedido ${order.id} falhou: ${error.message}`)
      }
    }
    return this.getOrder(userId, publicId)
  }

  /** Cancela pedidos vencidos, devolve o cupom reservado e encerra os links de pagamento. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOverdueOrders(): Promise<number> {
    try {
      const result = await this.db.transaction(async (tx) => {
        // Com várias instâncias da API, só uma faz a faxina por vez (as outras passam direto).
        const lock = await tx.execute(sql`select pg_try_advisory_xact_lock(7340961) as acquired`)
        if (lock.rows[0]?.acquired !== true) return { count: 0, preferenceIds: [] as string[] }
        return this.expireOverdue(tx)
      })
      await this.closeCheckouts(result.preferenceIds)
      return result.count
    } catch (error) {
      this.logger.error(`Falha ao expirar pedidos pendentes: ${String(error)}`)
      return 0
    }
  }

  // ---------------------------------------------------------------------------------------------

  /**
   * Pedidos `pending` (e `failed` que ainda seguram cupom) com mais de 48 h viram `cancelled`
   * (`provider_status = expired`) e devolvem o cupom. Sem filtro varre tudo (o job); com `userId` e/ou
   * `couponId` só os dessa pessoa ou desse cupom (pedido de usuário nunca varre cupom de terceiros).
   * Pula pedidos que outra transação está processando (webhook chegando agora). Devolve as
   * preferências a encerrar no gateway DEPOIS de a transação fechar.
   */
  async expireOverdue(
    tx: DbExecutor,
    scope: { userId?: string; couponId?: number } = {},
    now = new Date(),
  ): Promise<{ count: number; preferenceIds: string[] }> {
    const cutoff = new Date(now.getTime() - ORDER_TTL_MS)
    const scoped =
      scope.userId || scope.couponId
        ? or(
            scope.userId ? eq(checkoutOrders.userId, scope.userId) : undefined,
            scope.couponId ? eq(checkoutOrders.couponId, scope.couponId) : undefined,
          )
        : undefined
    const overdueWhere = and(
      lt(checkoutOrders.createdAt, cutoff),
      or(
        eq(checkoutOrders.status, 'pending'),
        and(
          eq(checkoutOrders.status, 'failed'),
          sql`${checkoutOrders.metadata}->>'coupon_reservation' = 'reserved'`,
        ),
      ),
      scoped,
    )
    const candidates = await tx
      .select({ id: checkoutOrders.id, couponId: checkoutOrders.couponId })
      .from(checkoutOrders)
      .where(overdueWhere)
      .orderBy(checkoutOrders.couponId, checkoutOrders.id)
      .limit(200)

    const preferenceIds: string[] = []
    let count = 0
    for (const candidate of candidates) {
      // Cupom primeiro, pedido depois; o pedido que outra transação está processando é pulado.
      await this.couponsService.lockById(tx, candidate.couponId)
      const [order] = await tx
        .select()
        .from(checkoutOrders)
        .where(and(eq(checkoutOrders.id, candidate.id), overdueWhere))
        .for('update', { skipLocked: true })
      if (!order) continue
      const metadata = await this.payments.releaseCoupon(tx, order, metadataOf(order))
      await tx
        .update(checkoutOrders)
        .set({ status: 'cancelled', providerStatus: 'expired', metadata })
        .where(eq(checkoutOrders.id, order.id))
      if (order.preferenceId) preferenceIds.push(order.preferenceId)
      count += 1
    }
    if (count > 0) this.logger.log(`${count} pedido(s) pendente(s) expirado(s)`)
    return { count, preferenceIds }
  }

  /** Encerra links de pagamento no gateway. Falha aqui não derruba nada (o link vence sozinho em 48 h). */
  private async closeCheckouts(preferenceIds: string[]) {
    for (const preferenceId of preferenceIds) {
      try {
        await this.gateway.closeCheckout(preferenceId)
      } catch (error) {
        this.logger.warn(
          `Não foi possível encerrar o link ${preferenceId}: ${error instanceof Error ? error.message : 'erro'}`,
        )
      }
    }
  }

  /** Pedidos desta pessoa que ainda seguram reserva de cupom ou esperam pagamento, e não venceram. */
  private holdingOrders(tx: DbExecutor, userId: string) {
    return tx
      .select()
      .from(checkoutOrders)
      .where(
        and(
          eq(checkoutOrders.userId, userId),
          inArray(checkoutOrders.status, [...HOLDING_ORDER_STATUSES]),
          gt(checkoutOrders.createdAt, new Date(Date.now() - ORDER_TTL_MS)),
          // `failed` só interessa enquanto segura o cupom (sem cupom já está morto).
          or(
            inArray(checkoutOrders.status, [...OPEN_ORDER_STATUSES]),
            sql`${checkoutOrders.metadata}->>'coupon_reservation' = 'reserved'`,
          ),
        ),
      )
      .orderBy(desc(checkoutOrders.createdAt))
      .limit(30)
  }

  private async courseIdsOf(tx: DbExecutor, orderId: number): Promise<number[]> {
    const rows = await tx
      .select({ courseId: checkoutOrderItems.courseId })
      .from(checkoutOrderItems)
      .where(eq(checkoutOrderItems.orderId, orderId))
      .orderBy(asc(checkoutOrderItems.courseId))
    return rows.map((row) => row.courseId)
  }

  /** O pendente que é IGUAL ao pedido pedido agora (mesmos cursos, mesmo cupom, mesmo total). */
  private async findReusable(tx: DbExecutor, open: OrderRow[], priced: PricedCart) {
    if (priced.totalCents === 0) return undefined
    const wanted = priced.lines
      .map((line) => line.courseId)
      .sort((a, b) => a - b)
      .join(',')
    for (const candidate of open) {
      if (candidate.totalAmount !== centsToReais(priced.totalCents)) continue
      if ((candidate.couponId ?? null) !== (priced.coupon?.id ?? null)) continue
      if ((await this.courseIdsOf(tx, candidate.id)).join(',') === wanted) return candidate
    }
    return undefined
  }

  /**
   * Cancela os pendentes antigos que competem com o pedido novo: os que têm algum dos mesmos
   * cursos (cobrança duplicada) ou o mesmo cupom (a reserva volta para o pedido novo).
   */
  private async supersedeConflicting(
    tx: DbExecutor,
    holding: OrderRow[],
    priced: PricedCart,
  ): Promise<string[]> {
    const newCourseIds = new Set(priced.lines.map((line) => line.courseId))
    const preferenceIds: string[] = []
    for (const old of holding) {
      // Pagamento em análise não é substituído (pode ser aprovado a qualquer momento).
      if (old.status === 'in_process') continue
      const sameCoupon = priced.coupon !== null && old.couponId === priced.coupon.id
      const sharesCourse = (await this.courseIdsOf(tx, old.id)).some((id) => newCourseIds.has(id))
      if (!sameCoupon && !sharesCourse) continue

      // Trava o pedido antigo (o cupom dele já foi travado): um webhook pagando agora espera aqui.
      const [locked] = await tx
        .select()
        .from(checkoutOrders)
        .where(
          and(eq(checkoutOrders.id, old.id), inArray(checkoutOrders.status, ['pending', 'failed'])),
        )
        .for('update')
      if (!locked) continue
      const metadata = await this.payments.releaseCoupon(tx, locked, metadataOf(locked))
      await tx
        .update(checkoutOrders)
        .set({ status: 'cancelled', providerStatus: 'superseded', metadata })
        .where(eq(checkoutOrders.id, locked.id))
      if (locked.preferenceId) preferenceIds.push(locked.preferenceId)
    }
    return preferenceIds
  }

  private async insertOrder(
    tx: DbExecutor,
    user: SessionUser,
    input: CreateOrderInput,
    priced: PricedCart,
    couponReserved: boolean,
  ): Promise<OrderRow> {
    const courseIds = priced.lines.map((line) => line.courseId)
    const producerByCourse = new Map(priced.lines.map((line) => [line.courseId, line.producerId]))
    const producerIds = [...new Set(priced.lines.map((line) => line.producerId))]

    const rates = await tx
      .select({ id: profiles.id, commissionRate: profiles.commissionRate })
      .from(profiles)
      .where(inArray(profiles.id, producerIds))
    const rateByProducer = new Map(rates.map((row) => [row.id, row.commissionRate]))

    const attributions = await this.affiliates.resolveForCourses(tx, {
      courseIds,
      tracking: input.affiliate,
      buyerId: user.id,
      producerByCourse,
    })

    const publicId = randomUUID()
    const now = Date.now()
    const [order] = await tx
      .insert(checkoutOrders)
      .values({
        publicId,
        externalReference: publicId,
        userId: user.id,
        provider: 'mercadopago',
        status: 'pending',
        providerStatus: 'pending',
        currency: 'BRL',
        subtotalAmount: centsToReais(priced.subtotalCents),
        discountAmount: centsToReais(priced.discountCents),
        totalAmount: centsToReais(priced.totalCents),
        couponId: priced.coupon?.id ?? null,
        couponCode: priced.coupon?.code ?? null,
        couponEligibleCourseIds: priced.coupon ? priced.eligibleCourseIds : [],
        buyerFullName: user.name,
        buyerEmail: user.email,
        requestedPaymentMethod: input.paymentMethod,
        metadata: {
          source: 'public_checkout',
          items_count: priced.lines.length,
          checkout_identity_mode: 'authenticated',
          expires_at: new Date(now + ORDER_TTL_MS).toISOString(),
          ...(couponReserved ? { coupon_reservation: 'reserved' } : {}),
          affiliate_attribution: {
            tracking_session_key: input.affiliate?.sessionKey ?? null,
            tracking_visitor_key: input.affiliate?.visitorKey ?? null,
            attribution_model: 'last_click',
            attributed_items_count: attributions.size,
            attributed_course_ids: [...attributions.keys()],
            attributions: [...attributions.values()].map((attribution) => ({
              course_id: attribution.courseId,
              affiliate_id: attribution.affiliateId,
              affiliate_link_id: attribution.affiliateLinkId,
              affiliate_link_code: attribution.affiliateLinkCode,
              partnership_id: attribution.partnershipId,
              attribution_id: attribution.attributionId,
              attribution_model: attribution.attributionModel,
              attributed_at: attribution.attributedAt,
              expires_at: attribution.expiresAt,
              commission_rate: attribution.commissionRate,
              cookie_window_days: attribution.cookieWindowDays,
            })),
          },
        },
      })
      .returning()

    await tx.insert(checkoutOrderItems).values(
      priced.lines.map((line) => {
        const rate = normalizeCommissionRate(rateByProducer.get(line.producerId))
        const { producerCents, platformCents } = splitRevenue(line.finalCents, rate)
        const attribution = attributions.get(line.courseId)
        const { affiliateCents, producerNetCents } = splitAffiliate(
          producerCents,
          attribution?.commissionRate ?? 0,
        )
        return {
          orderId: order!.id,
          courseId: line.courseId,
          courseTitle: line.title,
          producerId: line.producerId,
          listedPrice: centsToReais(line.listedCents),
          finalPrice: centsToReais(line.finalCents),
          platformCommissionRate: rate,
          platformAmount: centsToReais(platformCents),
          producerAmount: centsToReais(producerNetCents),
          metadata: {
            course_slug: line.slug,
            gross_sale_amount: centsToReais(line.finalCents),
            platform_commission_rate: rate,
            platform_commission_amount: centsToReais(platformCents),
            producer_gross_amount: centsToReais(producerCents),
            affiliate_commission_rate: attribution?.commissionRate ?? 0,
            affiliate_commission_amount: centsToReais(affiliateCents),
            producer_net_amount: centsToReais(producerNetCents),
            affiliate_attribution: attribution
              ? {
                  attribution_id: attribution.attributionId,
                  attribution_model: attribution.attributionModel,
                  affiliate_id: attribution.affiliateId,
                  affiliate_link_id: attribution.affiliateLinkId,
                  affiliate_link_code: attribution.affiliateLinkCode,
                  partnership_id: attribution.partnershipId,
                  commission_rate: attribution.commissionRate,
                  cookie_window_days: attribution.cookieWindowDays,
                  attributed_at: attribution.attributedAt,
                  expires_at: attribution.expiresAt,
                }
              : null,
          },
        }
      }),
    )
    return order!
  }

  /**
   * Abre o pagamento no Mercado Pago (fora da transação do banco: nada de transação aberta
   * esperando rede). Se o gateway falhar, o pedido é encerrado e o cupom volta, e a pessoa pode
   * tentar de novo.
   */
  private async openCheckout(order: OrderRow, user: SessionUser): Promise<OrderRow> {
    const items = await loadItems(this.db, order.id)
    const title =
      items.length === 1
        ? items[0]!.courseTitle
        : `${items.length} cursos: ${items.map((item) => item.courseTitle).join(', ')}`

    try {
      const checkout = await this.gateway.createCheckout({
        orderId: order.publicId,
        title,
        totalCents: dbToCents(order.totalAmount),
        payerEmail: user.email,
        payerName: user.name,
        expiresAt: new Date(order.createdAt.getTime() + ORDER_TTL_MS),
        paymentMethods: await this.settings.getPaymentOptions(),
      })
      // Só grava se ainda não há link: dois cliques ao mesmo tempo abrem dois checkouts, mas só o
      // primeiro a terminar vale (o outro fica órfão no gateway e expira sozinho).
      const [updated] = await this.db
        .update(checkoutOrders)
        .set({ preferenceId: checkout.preferenceId, checkoutUrl: checkout.checkoutUrl })
        .where(
          and(
            eq(checkoutOrders.id, order.id),
            eq(checkoutOrders.status, 'pending'),
            isNull(checkoutOrders.checkoutUrl),
          ),
        )
        .returning()
      return updated ?? (await this.reload(this.db, order.id))
    } catch (error) {
      this.logger.error(
        `Falha ao abrir checkout do pedido ${order.id}: ${error instanceof Error ? error.message : 'erro'}`,
      )
      await this.db.transaction(async (tx) => {
        await this.couponsService.lockById(tx, order.couponId)
        const [locked] = await tx
          .select()
          .from(checkoutOrders)
          .where(and(eq(checkoutOrders.id, order.id), eq(checkoutOrders.status, 'pending')))
          .for('update')
        if (!locked) return
        const metadata = await this.payments.releaseCoupon(tx, locked, metadataOf(locked))
        await tx
          .update(checkoutOrders)
          .set({ status: 'failed', providerStatus: 'checkout_unavailable', metadata })
          .where(eq(checkoutOrders.id, locked.id))
      })
      if (error instanceof PaymentsNotConfiguredError) {
        throw new ServiceUnavailableException(
          'Os pagamentos ainda não foram configurados. Avise o administrador da plataforma.',
        )
      }
      throw new ServiceUnavailableException(
        'Não foi possível iniciar o pagamento agora. Tente de novo em instantes.',
      )
    }
  }

  private async reload(executor: DbExecutor, orderId: number): Promise<OrderRow> {
    const [order] = await executor
      .select()
      .from(checkoutOrders)
      .where(eq(checkoutOrders.id, orderId))
    if (!order) throw new NotFoundException('Pedido não encontrado.')
    return order
  }

  private async findOwned(executor: DbExecutor, userId: string, publicId: string) {
    const [order] = await executor
      .select()
      .from(checkoutOrders)
      .where(and(eq(checkoutOrders.publicId, publicId), eq(checkoutOrders.userId, userId)))
    if (!order) throw new NotFoundException('Pedido não encontrado.')
    return order
  }
}
