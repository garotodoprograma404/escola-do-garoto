import { apiServer } from '@/lib/server-api'
import type { ProducerEngagement } from '../types'

/** Engajamento (sequência, medalhas, pontos do mês) dos alunos dos cursos do produtor logado. */
export async function getProducerEngagement(courseId?: string): Promise<ProducerEngagement | null> {
  const result = await apiServer<ProducerEngagement>('/producer/gamification/engagement', {
    query: { courseId: courseId && /^\d+$/.test(courseId) ? courseId : undefined },
  })
  if (!result.ok) {
    console.error('Error fetching producer engagement:', result.error.message)
    return null
  }
  return result.data
}
