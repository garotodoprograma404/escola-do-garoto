// Coupon management service
//
// Chamador fino da API (`/api/admin/coupons`, só admin). As regras (validade, cursos elegíveis,
// código único, auditoria) moram na API; aqui só se pede e se devolve no formato que as telas
// já usam. A API recusa quem não é admin, então chamar daqui sem papel apenas falha.
import { apiServer } from '@/lib/server-api'
import type { ApiResult } from '@/lib/api-client'
import type { Coupon, CouponStats, CouponFilters, CouponCourseOption } from '../types'

const EMPTY_STATS: CouponStats = {
  totalCoupons: 0,
  activeCoupons: 0,
  totalUsage: 0,
  totalDiscountGiven: 0,
  averageDiscountPerUse: 0,
  conversionRate: 0,
}

function unwrap<T>(result: ApiResult<T>, fallbackMessage: string): T {
  if (!result.ok) {
    console.error(fallbackMessage, result.error.message)
    throw new Error(result.error.message || fallbackMessage)
  }
  return result.data
}

export async function getCouponStats(): Promise<CouponStats> {
  const result = await apiServer<CouponStats>('/admin/coupons/stats')
  if (!result.ok) {
    console.error('Error fetching coupon stats:', result.error.message)
    return EMPTY_STATS
  }
  return result.data
}

export async function getCoupons(filters: CouponFilters): Promise<Coupon[]> {
  const result = await apiServer<Coupon[]>('/admin/coupons', {
    query: {
      search: filters.searchTerm || undefined,
      status: filters.status,
      type: filters.type,
    },
  })
  return unwrap(result, 'Erro ao buscar cupons')
}

export async function getCouponCourseOptions(): Promise<CouponCourseOption[]> {
  const result = await apiServer<CouponCourseOption[]>('/admin/coupons/course-options')
  if (!result.ok) {
    console.error('Error fetching coupon course options:', result.error.message)
    return []
  }
  return result.data
}
