/** Campos do cupom que definem em que situação ele está. */
interface CouponStatusFields {
  is_active: boolean
  valid_until: string | null
  usage_limit: number | null
  usage_count: number
}

export function getCouponStatusFromRow(
  coupon: CouponStatusFields,
  now = new Date(),
): 'active' | 'inactive' | 'expired' | 'depleted' {
  if (!coupon.is_active) return 'inactive'

  if (coupon.valid_until && new Date(coupon.valid_until) < now) return 'expired'
  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return 'depleted'

  return 'active'
}

export function normalizeApplicableCourseIds(values?: string[]): number[] {
  if (!Array.isArray(values) || values.length === 0) {
    return []
  }

  return [
    ...new Set(
      values
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  ]
}

export function calculateCouponConversionRate(totalOrders: number, couponOrders: number): number {
  if (totalOrders <= 0 || couponOrders <= 0) {
    return 0
  }

  return Number(((couponOrders / totalOrders) * 100).toFixed(1))
}
