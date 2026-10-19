// =====================================================
// CART FEATURE - TYPES
// =====================================================

export interface ApplyCouponResult {
  success: boolean
  message: string
  discount?: number
  finalTotal?: number
}
