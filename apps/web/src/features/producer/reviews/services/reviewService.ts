// =====================================================
// PRODUCER REVIEWS - SERVICE
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { ProducerReviews, ReviewFilter } from '../types'

const REVIEW_FILTERS: ReviewFilter[] = ['all', '5', '4', '3', '2', '1', 'no-response']

/**
 * Avaliações dos cursos do produtor logado, com as estatísticas. A API só enxerga cursos da sessão
 * (um `courseId` de outro produtor volta vazio); `userId` fica só por compatibilidade.
 */
export async function getProducerReviews(
  _userId: string,
  courseId?: string,
  filter: ReviewFilter = 'all',
): Promise<ProducerReviews> {
  const result = await apiServer<ProducerReviews>('/producer/reviews', {
    query: {
      courseId: courseId && /^\d+$/.test(courseId) ? courseId : undefined,
      filter: REVIEW_FILTERS.includes(filter) ? filter : 'all',
    },
  })

  if (!result.ok) {
    console.error('Error fetching reviews:', result.error.message)
    throw new Error('Failed to fetch reviews')
  }

  return result.data
}
