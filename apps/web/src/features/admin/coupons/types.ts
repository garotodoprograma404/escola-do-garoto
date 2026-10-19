// Coupon management types

type CouponType = 'percentage' | 'fixed'
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'depleted'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  description: string
  status: CouponStatus
  usageLimit: number | null
  usageCount: number
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  validFrom: string
  validUntil: string | null
  applicableCourses: string[] // IDs dos cursos, vazio = todos
  applicableCourseTitles: string[]
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface CouponStats {
  totalCoupons: number
  activeCoupons: number
  totalUsage: number
  totalDiscountGiven: number
  averageDiscountPerUse: number
  conversionRate: number
}

export interface CouponFilters {
  searchTerm: string
  status: CouponStatus | 'ALL'
  type: CouponType | 'ALL'
}

export interface CouponCourseOption {
  id: string
  title: string
  price: number
  discountPrice: number | null
  couponsEnabled: boolean
}
