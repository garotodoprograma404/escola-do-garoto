// =====================================================
// COURSE DETAIL - SERVICE
// =====================================================
// A regra mora na API (GET /api/public/catalog/courses/...). Detalhe só de curso aprovado e
// publicado; o conteúdo das aulas só vem nas prévias grátis.

import { apiServer } from '@/lib/server-api'
import type { CourseDetail, CourseReview, ReviewStats } from '../types'

interface RelatedCourseResult {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  total_students: number
  category_name: string
  producer_name: string
}

const EMPTY_REVIEW_STATS: ReviewStats = {
  average_rating: 0,
  total_reviews: 0,
  rating_distribution: [
    { rating: 5, count: 0, percentage: 0 },
    { rating: 4, count: 0, percentage: 0 },
    { rating: 3, count: 0, percentage: 0 },
    { rating: 2, count: 0, percentage: 0 },
    { rating: 1, count: 0, percentage: 0 },
  ],
}

/**
 * Busca detalhes completos do curso (ou `null` se não existir / não estiver publicado)
 */
export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) return null

  const result = await apiServer<CourseDetail>(
    `/public/catalog/courses/${encodeURIComponent(normalizedSlug)}`,
  )
  if (!result.ok) {
    if (result.error.statusCode !== 404 && result.error.statusCode !== 400) {
      console.error('Error fetching course:', result.error.message)
    }
    return null
  }
  return result.data
}

/**
 * Busca as avaliações mais recentes do curso (nome de quem avaliou, nota, comentário e resposta do produtor)
 */
export async function getCourseReviews(
  courseId: number,
  limit: number = 20,
): Promise<CourseReview[]> {
  const result = await apiServer<CourseReview[]>(`/public/catalog/courses/${courseId}/reviews`, {
    query: { limit },
  })
  return result.ok ? result.data : []
}

/**
 * Busca estatísticas de reviews (média e distribuição de notas)
 */
export async function getReviewStats(courseId: number): Promise<ReviewStats> {
  const result = await apiServer<ReviewStats>(`/public/catalog/courses/${courseId}/reviews/stats`)
  return result.ok ? result.data : EMPTY_REVIEW_STATS
}

/**
 * Busca cursos relacionados (mesma categoria do curso; a API descobre a categoria sozinha,
 * por isso `categoryId` não é enviado: o parâmetro existe só para manter a assinatura).
 */
export async function getRelatedCourses(
  courseId: number,
  _categoryId: number,
  limit: number = 4,
): Promise<RelatedCourseResult[]> {
  const result = await apiServer<RelatedCourseResult[]>(
    `/public/catalog/courses/${courseId}/related`,
    { query: { limit } },
  )
  return result.ok ? result.data : []
}
