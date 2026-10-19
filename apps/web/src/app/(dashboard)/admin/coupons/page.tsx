import { CouponsManagement } from '@/features/admin/coupons/components/CouponsManagement.client'
import {
  getCouponCourseOptions,
  getCouponStats,
  getCoupons,
} from '@/features/admin/coupons/services/couponService'

export default async function AdminCouponsPage() {
  const [stats, coupons, courseOptions] = await Promise.all([
    getCouponStats(),
    getCoupons({ searchTerm: '', status: 'ALL', type: 'ALL' }),
    getCouponCourseOptions(),
  ])

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <CouponsManagement
        initialStats={stats}
        initialCoupons={coupons}
        courseOptions={courseOptions}
      />
    </div>
  )
}
