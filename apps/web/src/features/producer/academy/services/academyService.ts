// =====================================================
// PRODUCER ACADEMY - SERVICE
// =====================================================

import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/server-api'
import type {
  AcademyContent,
  ProducerAcademy,
  Category,
  CategoryFilter,
  DifficultyFilter,
  Difficulty,
} from '../types'

const CATEGORIES: Category[] = [
  'getting_started',
  'course_creation',
  'marketing',
  'sales',
  'analytics',
  'best_practices',
]
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced']

/**
 * Conteúdo publicado da academia, com o progresso de quem está logado (a API usa a sessão;
 * `userId` fica só por compatibilidade com quem já chama).
 */
export async function getAcademyContent(
  _userId: string,
  categoryFilter: CategoryFilter = 'all',
  difficultyFilter: DifficultyFilter = 'all',
): Promise<ProducerAcademy> {
  const result = await apiServer<ProducerAcademy>('/producer/academy', {
    query: {
      category:
        categoryFilter !== 'all' && CATEGORIES.includes(categoryFilter)
          ? categoryFilter
          : undefined,
      difficulty:
        difficultyFilter !== 'all' && DIFFICULTIES.includes(difficultyFilter)
          ? difficultyFilter
          : undefined,
    },
  })

  if (!result.ok) {
    console.error('Error fetching academy content:', result.error.message)
    throw new Error('Failed to fetch academy content')
  }

  return result.data
}

export async function getAcademyContentById(
  contentId: string,
  _userId: string,
): Promise<AcademyContent> {
  const result = await apiServer<AcademyContent>(
    `/producer/academy/${encodeURIComponent(contentId)}`,
  )

  if (!result.ok) {
    // Conteúdo inexistente, em rascunho ou com id inválido: página 404 em vez de erro 500.
    if (result.error.statusCode === 404 || result.error.statusCode === 400) notFound()
    console.error('Error fetching academy content:', result.error.message)
    throw new Error('Failed to fetch academy content')
  }

  return result.data
}
