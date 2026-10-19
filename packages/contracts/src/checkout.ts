import { z } from 'zod'

export const MAX_COURSES_PER_ORDER = 10

/** Cupom digitado pelo usuário: sem espaços, em MAIÚSCULAS, só letras/números/_/-. */
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Cupom inválido')
  .max(32, 'Cupom inválido')
  .regex(/^[A-Z0-9_-]+$/, 'Cupom inválido')

const courseIdsSchema = z
  .array(z.uuid({ error: 'Curso inválido' }))
  .min(1, 'Escolha pelo menos um curso')
  .max(MAX_COURSES_PER_ORDER, `No máximo ${MAX_COURSES_PER_ORDER} cursos por pedido`)
  .refine((ids) => new Set(ids).size === ids.length, 'Curso repetido no pedido')

/** O cliente manda SÓ os ids e o cupom. Preço, desconto e total são sempre calculados no servidor. */
export const createOrderInputSchema = z.object({
  courseIds: courseIdsSchema,
  couponCode: couponCodeSchema.optional(),
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

/** Simulação do pedido (query string): `?courseIds=a,b&coupon=PROMO10`. */
export const quoteQuerySchema = z.object({
  courseIds: z
    .string()
    .max(500)
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(courseIdsSchema),
  coupon: couponCodeSchema.optional(),
})
export type QuoteQuery = z.infer<typeof quoteQuerySchema>

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type QuoteItem = {
  courseId: string
  slug: string
  title: string
  instructorName: string
  thumbnailUrl: string | null
  /** Preço do curso hoje (já com a promoção dele), antes do cupom. */
  listPriceCents: number
  discountCents: number
  finalPriceCents: number
}

export type Quote = {
  items: QuoteItem[]
  subtotalCents: number
  discountCents: number
  totalCents: number
  coupon: { code: string; discountCents: number } | null
}

export type OrderSummary = {
  id: string
  status: OrderStatus
  items: Array<{ courseId: string; slug: string; title: string; finalPriceCents: number }>
  subtotalCents: number
  discountCents: number
  totalCents: number
  couponCode: string | null
  /** Link para pagar no Mercado Pago. `null` se o pedido não precisa de pagamento (grátis) ou já saiu de "pendente". */
  checkoutUrl: string | null
  createdAt: string
  paidAt: string | null
  expiresAt: string
}

/** Resultado do simulador de pagamento (só desenvolvimento). */
export const SIMULATED_OUTCOMES = ['approved', 'rejected', 'pending', 'refunded'] as const
export type SimulatedOutcome = (typeof SIMULATED_OUTCOMES)[number]
export const simulatePaymentInputSchema = z.object({ outcome: z.enum(SIMULATED_OUTCOMES) })
