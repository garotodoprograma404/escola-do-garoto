// =====================================================
// CHECKOUT - VALIDATIONS
// =====================================================

import { z } from 'zod'

export const checkoutSchema = z.object({
  payment_method: z.enum(['credit_card', 'pix', 'boleto']),
  card_number: z.string().optional(),
  card_name: z.string().optional(),
  card_expiry: z.string().optional(),
  card_cvv: z.string().optional(),
  coupon_code: z.string().optional(),
})

export type CheckoutSchema = z.infer<typeof checkoutSchema>
