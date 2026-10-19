// =====================================================
// PRODUCER ANALYTICS - SERVICE
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { ProducerAnalytics, AnalyticsFilters } from '../types'

/**
 * Analytics do produtor logado. As contas (períodos, funil, receita por curso) são feitas na API,
 * que só enxerga os cursos da sessão.
 */
export async function getProducerAnalytics(filters: AnalyticsFilters): Promise<ProducerAnalytics> {
  const result = await apiServer<ProducerAnalytics>('/producer/analytics', {
    query: {
      dateRange: filters.dateRange,
      courseId: filters.courseId && /^\d+$/.test(filters.courseId) ? filters.courseId : undefined,
    },
  })

  if (!result.ok) {
    console.error('Error fetching producer analytics:', result.error.message)
    throw new Error('Failed to fetch analytics')
  }

  return result.data
}
