// =====================================================
// PRODUCER Q&A - SERVICE
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { ProducerQnA, QuestionFilter } from '../types'

const QUESTION_FILTERS: QuestionFilter[] = ['all', 'pending', 'answered']

/**
 * Perguntas dos alunos nos cursos do produtor logado, com as estatísticas. A API só enxerga cursos
 * da sessão; `userId` fica só por compatibilidade com quem já chama.
 */
export async function getProducerQuestions(
  _userId: string,
  courseId?: string,
  filter: QuestionFilter = 'all',
): Promise<ProducerQnA> {
  const result = await apiServer<ProducerQnA>('/producer/questions', {
    query: {
      courseId: courseId && /^\d+$/.test(courseId) ? courseId : undefined,
      filter: QUESTION_FILTERS.includes(filter) ? filter : 'all',
    },
  })

  if (!result.ok) {
    console.error('Error fetching questions:', result.error.message)
    throw new Error('Failed to fetch questions')
  }

  return result.data
}
