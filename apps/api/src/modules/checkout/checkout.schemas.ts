import { z } from 'zod'
import { MAX_COURSES_PER_ORDER } from './checkout.constants.js'

/** Código de cupom digitado: sem espaços, em MAIÚSCULAS, só letras/números/_/-. */
const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Cupom inválido')
  .max(40, 'Cupom inválido')
  .regex(/^[A-Z0-9_-]+$/, 'Cupom inválido')

const courseIdsSchema = z
  .array(z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER))
  .min(1, 'Escolha pelo menos um curso')
  .max(MAX_COURSES_PER_ORDER, `No máximo ${MAX_COURSES_PER_ORDER} cursos por pedido`)
  .transform((ids) => [...new Set(ids)])

const PAYMENT_METHODS = ['credit_card', 'pix', 'boleto'] as const

const trackingKeySchema = z.string().trim().min(1).max(120).nullish()

/**
 * O cliente manda SÓ ids de curso, o cupom, o método preferido e as chaves de rastreio do afiliado.
 * Preço, desconto, taxa e total são sempre calculados no servidor (campos extras são descartados).
 */
export const createOrderSchema = z.object({
  courseIds: courseIdsSchema,
  couponCode: couponCodeSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  affiliate: z.object({ sessionKey: trackingKeySchema, visitorKey: trackingKeySchema }).optional(),
})
export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const applyCouponSchema = z.object({
  code: couponCodeSchema,
  courseIds: courseIdsSchema,
})
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>

export const orderPublicIdSchema = z.uuid({ error: 'Pedido inválido' })

export const finalizeAccountSchema = z.object({
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres').max(128),
})
export type FinalizeAccountInput = z.infer<typeof finalizeAccountSchema>

export const simulatePaymentSchema = z.object({
  outcome: z.enum(['approved', 'rejected', 'pending', 'refunded']),
})
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>
