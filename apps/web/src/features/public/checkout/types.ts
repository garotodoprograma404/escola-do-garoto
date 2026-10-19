// =====================================================
// CHECKOUT FEATURE - TYPES
// =====================================================

export interface CheckoutFormData {
  // Payment Method
  payment_method: 'credit_card' | 'pix' | 'boleto'

  // Credit Card (if applicable)
  card_number?: string
  card_name?: string
  card_expiry?: string
  card_cvv?: string

  // Coupon
  coupon_code?: string
}

export interface CheckoutResult {
  success: boolean
  message: string
  enrollment_ids?: number[]
  transaction_id?: number
  order_id?: string
  redirect_url?: string
  should_clear_cart?: boolean
}
