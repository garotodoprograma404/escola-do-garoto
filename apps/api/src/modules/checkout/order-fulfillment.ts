import { and, asc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm'
import type { DbExecutor } from '../../database/database.module.js'
import {
  certificateEvents,
  certificates,
  checkoutOrderItems,
  checkoutOrders,
  couponUsage,
  coupons,
  courses,
  enrollments,
  transactions,
} from '../../database/schema/index.js'
import { centsToReais, dbToCents } from './money.js'

/**
 * Efeitos de um pedido que muda de estado. Funções soltas que recebem a transação: quem chama
 * (criação de pedido grátis, webhook, sincronização, simulador) abre a transação e já travou a
 * linha do pedido (`FOR UPDATE`), então estado do pedido e estes efeitos andam sempre juntos:
 * ou tudo acontece, ou nada.
 */

export type OrderRow = typeof checkoutOrders.$inferSelect
export type OrderItemRow = typeof checkoutOrderItems.$inferSelect

type FulfillSource =
  | 'checkout_action'
  | 'mercadopago_webhook'
  | 'checkout_success_reconciliation'
  | 'simulator'
  | 'account_finalization'

export type FulfillContext = {
  /** Id do pagamento no gateway (ou `FREE_<pedido>` para pedido grátis). */
  paymentId: string
  /** `credit_card`, `pix`, `boleto`, `free_coupon`… (ver `normalizePaymentMethod`). */
  paymentMethod: string
  providerStatus: string
  source: FulfillSource
  free: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function metadataOf(order: Pick<OrderRow, 'metadata'>): Record<string, unknown> {
  return isRecord(order.metadata) ? order.metadata : {}
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isInteger(item) && item > 0)
    : []
}

/**
 * Tipo de pagamento do Mercado Pago → o rótulo que as telas conhecem (`credit_card`, `pix`,
 * `boleto`). O que não conhecemos passa como veio.
 */
export function normalizePaymentMethod(paymentTypeId: string | null | undefined): string {
  switch (paymentTypeId) {
    case 'credit_card':
    case 'debit_card':
    case 'prepaid_card':
      return 'credit_card'
    case 'bank_transfer':
    case 'pix':
      return 'pix'
    case 'ticket':
      return 'boleto'
    case undefined:
    case null:
    case '':
      return 'checkout_pro'
    default:
      return paymentTypeId.slice(0, 40)
  }
}

/** Itens do pedido na ordem em que foram gravados. */
export function loadItems(executor: DbExecutor, orderId: number): Promise<OrderItemRow[]> {
  return executor
    .select()
    .from(checkoutOrderItems)
    .where(eq(checkoutOrderItems.orderId, orderId))
    .orderBy(asc(checkoutOrderItems.id))
}

/**
 * Pedido pago: libera o acesso, grava as transações (aluno, produtor, afiliado), consome o cupom e
 * fecha o pedido. Idempotente: rodar de novo não duplica matrícula, transação nem uso de cupom.
 *
 * Quem chama garante que o pedido tem `userId` (pedido sem conta fica aguardando a conta).
 */
export async function fulfillOrder(tx: DbExecutor, order: OrderRow, context: FulfillContext) {
  const userId = order.userId
  if (!userId) throw new Error('Pedido sem usuário não pode ser liberado')

  const items = await loadItems(tx, order.id)
  const courseIds = items.map((item) => item.courseId)
  const now = new Date()
  const metadata = metadataOf(order)

  // --- matrículas ---------------------------------------------------------------------------
  const existing = await tx
    .select({ id: enrollments.id, courseId: enrollments.courseId, status: enrollments.status })
    .from(enrollments)
    .where(and(eq(enrollments.studentId, userId), inArray(enrollments.courseId, courseIds)))
  const known = new Map(existing.map((row) => [row.courseId, row]))

  const toCreate = courseIds.filter((id) => !known.has(id))
  const toReactivate = existing
    .filter((row) => row.status === 'cancelled' || row.status === 'refunded')
    .map((row) => row.courseId)

  const granted: number[] = []
  if (toCreate.length > 0) {
    const inserted = await tx
      .insert(enrollments)
      .values(
        toCreate.map((courseId) => ({ studentId: userId, courseId, status: 'active' as const })),
      )
      .onConflictDoNothing()
      .returning({ courseId: enrollments.courseId })
    granted.push(...inserted.map((row) => row.courseId))
  }
  if (toReactivate.length > 0) {
    // Comprou de novo um curso estornado/cancelado: a MESMA matrícula volta (progresso preservado).
    await tx
      .update(enrollments)
      .set({ status: 'active' })
      .where(
        and(
          eq(enrollments.studentId, userId),
          inArray(enrollments.courseId, toReactivate),
          inArray(enrollments.status, ['cancelled', 'refunded']),
        ),
      )
    granted.push(...toReactivate)
  }
  if (granted.length > 0) {
    await tx
      .update(courses)
      .set({ totalStudents: sql`${courses.totalStudents} + 1` })
      .where(inArray(courses.id, granted))
  }

  const allEnrollments = await tx
    .select({ id: enrollments.id, courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.studentId, userId), inArray(enrollments.courseId, courseIds)))
  const enrollmentByCourse = new Map(allEnrollments.map((row) => [row.courseId, row.id]))

  // --- transações ---------------------------------------------------------------------------
  const { paymentId, paymentMethod } = context
  const totalPlatformCents = items.reduce((sum, item) => sum + dbToCents(item.platformAmount), 0)
  const totalProducerCents = items.reduce((sum, item) => sum + dbToCents(item.producerAmount), 0)

  // A do aluno: uma só por pedido (soma dos cursos).
  const [studentTransaction] = await tx
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'sale'),
        eq(transactions.paymentId, paymentId),
        isNull(transactions.courseId),
      ),
    )
  if (!studentTransaction) {
    await tx.insert(transactions).values({
      userId,
      type: 'sale',
      amount: order.totalAmount,
      status: 'completed',
      paymentMethod,
      paymentId,
      courseId: null,
      enrollmentId: enrollmentByCourse.get(courseIds[0]!) ?? null,
      metadata: {
        source: 'student_checkout',
        order_id: order.id,
        order_public_id: order.publicId,
        provider: 'mercadopago',
        items_count: items.length,
        course_ids: courseIds,
        platform_commission_total: centsToReais(totalPlatformCents),
        producer_net_total: centsToReais(totalProducerCents),
      },
    })
  }

  // As do produtor: uma por curso (o índice único (pagamento, curso, usuário) segura a repetição).
  await tx
    .insert(transactions)
    .values(
      items.map((item) => {
        const itemMeta = isRecord(item.metadata) ? item.metadata : {}
        return {
          userId: item.producerId,
          type: 'sale' as const,
          amount: item.producerAmount,
          status: 'completed' as const,
          paymentMethod,
          paymentId,
          courseId: item.courseId,
          enrollmentId: enrollmentByCourse.get(item.courseId) ?? null,
          metadata: {
            source: 'producer_course_sale',
            provider: 'mercadopago',
            order_id: order.id,
            order_public_id: order.publicId,
            buyer_user_id: userId,
            gross_sale_amount: item.finalPrice,
            platform_commission_rate: item.platformCommissionRate,
            platform_commission_amount: item.platformAmount,
            producer_gross_amount: itemMeta.producer_gross_amount ?? item.producerAmount,
            affiliate_commission_rate: itemMeta.affiliate_commission_rate ?? 0,
            affiliate_commission_amount: itemMeta.affiliate_commission_amount ?? 0,
            producer_net_amount: item.producerAmount,
            has_affiliate_attribution: isRecord(itemMeta.affiliate_attribution),
            course_title: item.courseTitle,
          },
        }
      }),
    )
    .onConflictDoNothing()

  // A do afiliado: comissão PENDENTE (libera depois da janela de reembolso, regra do afiliado).
  const knownAffiliateRows = await tx
    .select({ userId: transactions.userId, metadata: transactions.metadata })
    .from(transactions)
    .where(
      and(eq(transactions.type, 'affiliate_commission'), eq(transactions.paymentId, paymentId)),
    )
  const knownAffiliateKeys = new Set(
    knownAffiliateRows.map(
      (row) => `${row.userId}:${isRecord(row.metadata) ? String(row.metadata.order_item_id) : ''}`,
    ),
  )
  for (const item of items) {
    const itemMeta = isRecord(item.metadata) ? item.metadata : {}
    const attribution = isRecord(itemMeta.affiliate_attribution)
      ? itemMeta.affiliate_attribution
      : null
    const commission = Number(itemMeta.affiliate_commission_amount ?? 0)
    const affiliateId =
      attribution && typeof attribution.affiliate_id === 'string' ? attribution.affiliate_id : ''
    if (!attribution || !affiliateId || !(commission > 0)) continue
    if (knownAffiliateKeys.has(`${affiliateId}:${item.id}`)) continue

    await tx.insert(transactions).values({
      userId: affiliateId,
      type: 'affiliate_commission',
      amount: commission,
      status: 'pending',
      paymentMethod,
      paymentId,
      courseId: null,
      enrollmentId: enrollmentByCourse.get(item.courseId) ?? null,
      metadata: {
        source: 'affiliate_commission_pending',
        provider: 'mercadopago',
        order_id: order.id,
        order_item_id: item.id,
        order_public_id: order.publicId,
        buyer_user_id: userId,
        producer_id: item.producerId,
        course_id: item.courseId,
        course_title: item.courseTitle,
        gross_sale_amount: item.finalPrice,
        platform_commission_rate: item.platformCommissionRate,
        platform_commission_amount: item.platformAmount,
        producer_gross_amount: itemMeta.producer_gross_amount ?? null,
        affiliate_commission_rate: itemMeta.affiliate_commission_rate ?? 0,
        affiliate_commission_amount: commission,
        producer_net_amount: item.producerAmount,
        affiliate_link_id: attribution.affiliate_link_id ?? null,
        affiliate_link_code: attribution.affiliate_link_code ?? null,
        partnership_id: attribution.partnership_id ?? null,
        attribution_id: attribution.attribution_id ?? null,
        attribution_model: attribution.attribution_model ?? null,
        attributed_at: attribution.attributed_at ?? null,
        expires_at: attribution.expires_at ?? null,
        release_status: 'pending_refund_window',
      },
    })
  }

  // --- cupom: reservado → consumido ---------------------------------------------------------
  let reservation = metadata.coupon_reservation
  let couponOveruse = false
  if (order.couponId && order.discountAmount > 0 && reservation !== 'consumed') {
    if (reservation !== 'reserved') {
      // O pedido expirou/foi substituído (cupom devolvido) e mesmo assim foi pago: o dinheiro entrou,
      // então o uso volta a contar. Tenta reservar COM o limite; se não houver vaga (ou a pessoa já
      // usou o cupom), conta mesmo assim e sinaliza `couponOveruse` para revisão.
      const reserved = await tx
        .update(coupons)
        .set({ usageCount: sql`${coupons.usageCount} + 1` })
        .where(
          and(
            eq(coupons.id, order.couponId),
            or(isNull(coupons.usageLimit), lt(coupons.usageCount, coupons.usageLimit)),
          ),
        )
        .returning({ id: coupons.id })
      const [alreadyUsed] = await tx
        .select({ id: couponUsage.id })
        .from(couponUsage)
        .where(and(eq(couponUsage.couponId, order.couponId), eq(couponUsage.userId, userId)))
        .limit(1)
      if (reserved.length === 0) {
        await tx
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.id, order.couponId))
      }
      couponOveruse = reserved.length === 0 || Boolean(alreadyUsed)
    }
    const usageCourseId = numberArray(order.couponEligibleCourseIds)[0] ?? courseIds[0]!
    await tx
      .insert(couponUsage)
      .values({
        couponId: order.couponId,
        userId,
        courseId: usageCourseId,
        enrollmentId: enrollmentByCourse.get(usageCourseId) ?? null,
        originalAmount: order.subtotalAmount,
        discountAmount: order.discountAmount,
        finalAmount: order.totalAmount,
      })
      .onConflictDoNothing()
    reservation = 'consumed'
  }

  // --- pedido -------------------------------------------------------------------------------
  const status = context.free ? ('free_completed' as const) : ('approved' as const)
  await tx
    .update(checkoutOrders)
    .set({
      status,
      providerStatus: context.providerStatus,
      paymentId,
      requestedPaymentMethod: paymentMethod,
      paidAt: order.paidAt ?? now,
      finalizedAt: now,
      metadata: {
        ...metadata,
        finalized_via: context.source,
        finalized_at: now.toISOString(),
        finalized_payment_id: paymentId,
        finalized_payment_method: paymentMethod,
        finalized_provider_status: context.providerStatus,
        enrollment_course_ids: courseIds,
        enrollment_granted_course_ids: granted,
        ...(reservation ? { coupon_reservation: reservation } : {}),
      },
    })
    .where(eq(checkoutOrders.id, order.id))

  return {
    status,
    grantedCourseIds: granted,
    couponOveruse,
  }
}

/**
 * Estorno/chargeback do pagamento que liquidou o pedido: o acesso dado POR ESTA compra acaba (com o
 * certificado dessas matrículas) e as transações do pedido (aluno, produtor, afiliado) ficam
 * `refunded`, que é o que tira o valor do saldo do produtor e do afiliado. Matrícula que a pessoa
 * já tinha antes da compra não é tocada.
 */
export async function revokeOrderAccess(tx: DbExecutor, order: OrderRow) {
  const metadata = metadataOf(order)
  const items = await loadItems(tx, order.id)
  const granted = numberArray(metadata.enrollment_granted_course_ids)
  let toRevoke =
    granted.length > 0 || 'enrollment_granted_course_ids' in metadata
      ? granted
      : items.map((item) => item.courseId)

  // Curso que OUTRO pedido pago da mesma pessoa também cobre (ex.: pagou dois links do mesmo curso)
  // continua com acesso: o estorno de um não tira o que o outro pagou.
  if (order.userId && toRevoke.length > 0) {
    const covered = await tx
      .select({ courseId: checkoutOrderItems.courseId })
      .from(checkoutOrderItems)
      .innerJoin(checkoutOrders, eq(checkoutOrders.id, checkoutOrderItems.orderId))
      .where(
        and(
          eq(checkoutOrders.userId, order.userId),
          ne(checkoutOrders.id, order.id),
          inArray(checkoutOrders.status, ['approved', 'free_completed']),
          inArray(checkoutOrderItems.courseId, toRevoke),
        ),
      )
    const coveredIds = new Set(covered.map((row) => row.courseId))
    toRevoke = toRevoke.filter((id) => !coveredIds.has(id))
  }

  let revoked: number[] = []
  if (order.userId && toRevoke.length > 0) {
    const rows = await tx
      .update(enrollments)
      .set({ status: 'refunded' })
      .where(
        and(
          eq(enrollments.studentId, order.userId),
          inArray(enrollments.courseId, toRevoke),
          inArray(enrollments.status, ['active', 'completed']),
        ),
      )
      .returning({ id: enrollments.id, courseId: enrollments.courseId })
    revoked = rows.map((row) => row.courseId)
    await revokeEnrollmentCertificates(
      tx,
      rows.map((row) => row.id),
    )
  }
  if (revoked.length > 0) {
    await tx
      .update(courses)
      .set({ totalStudents: sql`greatest(${courses.totalStudents} - 1, 0)` })
      .where(inArray(courses.id, revoked))
  }

  await tx
    .update(transactions)
    .set({
      status: 'refunded',
      metadata: sql`coalesce(${transactions.metadata}, '{}'::jsonb) || ${JSON.stringify({
        order_status_sync: 'refunded',
        order_status_sync_at: new Date().toISOString(),
      })}::jsonb`,
    })
    .where(
      and(
        inArray(transactions.type, ['sale', 'affiliate_commission']),
        inArray(transactions.status, ['completed', 'pending']),
        sql`${transactions.metadata}->>'order_id' = ${String(order.id)}`,
      ),
    )

  // Pedido de reembolso do aluno ainda aberto: o estorno resolveu (aprovado aqui ou feito direto no
  // Mercado Pago), então ele é concluído. O valor devolvido conta UMA vez: pela compra `refunded`.
  if (order.userId) {
    const studentSales = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, order.userId),
          eq(transactions.type, 'sale'),
          isNull(transactions.courseId),
          sql`${transactions.metadata}->>'order_id' = ${String(order.id)}`,
        ),
      )
    if (studentSales.length > 0) {
      await tx
        .update(transactions)
        .set({
          status: 'completed',
          metadata: sql`coalesce(${transactions.metadata}, '{}'::jsonb) || ${JSON.stringify({
            closed_reason: 'order_refunded',
            completed_at: new Date().toISOString(),
          })}::jsonb`,
        })
        .where(
          and(
            eq(transactions.type, 'refund'),
            eq(transactions.status, 'pending'),
            inArray(
              sql`(${transactions.metadata}->>'original_transaction_id')::bigint`,
              studentSales.map((row) => row.id),
            ),
          ),
        )
    }
  }
  return { revokedCourseIds: revoked }
}

/**
 * Revoga o certificado ativo das matrículas estornadas (a verificação pública passa a mostrar
 * "revogado"). Sem ator: quem decide é o estorno do pagamento, não um admin.
 */
async function revokeEnrollmentCertificates(tx: DbExecutor, enrollmentIds: number[]) {
  if (enrollmentIds.length === 0) return
  const now = new Date()
  const reason = 'Compra estornada'
  const revoked = await tx
    .update(certificates)
    .set({ status: 'revoked', revokedAt: now, revokedReason: reason, updatedAt: now })
    .where(
      and(inArray(certificates.enrollmentId, enrollmentIds), eq(certificates.status, 'active')),
    )
    .returning({ id: certificates.id, enrollmentId: certificates.enrollmentId })
  if (revoked.length === 0) return
  await tx.insert(certificateEvents).values(
    revoked.map((row) => ({
      certificateId: row.id,
      enrollmentId: row.enrollmentId,
      eventType: 'revoked' as const,
      actorUserId: null,
      previousStatus: 'active' as const,
      newStatus: 'revoked' as const,
      reason,
      payload: { source: 'order_refunded' },
      eventAt: now,
    })),
  )
  await tx
    .update(enrollments)
    .set({ certificateUrl: null, updatedAt: now })
    .where(
      inArray(
        enrollments.id,
        revoked.map((row) => row.enrollmentId),
      ),
    )
}
