import 'server-only'
import { apiServer } from '@/lib/server-api'
import type { CourseRanking, GamificationSummary } from '../types'

/** Conquistas de quem está logado (a API usa a sessão; nunca um id vindo de fora). */
export async function getGamificationSummary(): Promise<GamificationSummary | null> {
  const result = await apiServer<GamificationSummary>('/student/gamification')
  if (!result.ok) {
    console.error('Error loading gamification summary:', result.error.statusCode)
    return null
  }
  return result.data
}

export async function getCourseRanking(courseId: number): Promise<CourseRanking | null> {
  const result = await apiServer<CourseRanking>(`/student/gamification/ranking/${courseId}`)
  return result.ok ? result.data : null
}
