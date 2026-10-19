'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import type { CourseRanking } from '../types'

export async function loadCourseRankingAction(
  courseId: number,
): Promise<{ success: true; ranking: CourseRanking } | { success: false; error: string }> {
  if (!Number.isSafeInteger(courseId) || courseId <= 0) {
    return { success: false, error: 'Curso inválido.' }
  }
  const result = await apiServer<CourseRanking>(`/student/gamification/ranking/${courseId}`)
  if (!result.ok) return { success: false, error: result.error.message }
  return { success: true, ranking: result.data }
}

export async function setRankingVisibilityAction(
  visible: boolean,
): Promise<{ success: boolean; error?: string }> {
  const result = await apiServer('/student/gamification/ranking-visibility', {
    method: 'PUT',
    body: { visible },
  })
  if (!result.ok) return { success: false, error: result.error.message }
  revalidatePath('/student/conquistas')
  return { success: true }
}
