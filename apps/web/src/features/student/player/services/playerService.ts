// =====================================================
// STUDENT PLAYER - SERVICE (chamadas à API NestJS: módulo `learning`)
// =====================================================
//
// Toda regra (matrícula, aula publicada, progresso, quiz sem gabarito, HTML saneado) fica na API.
// Aqui só buscamos os dados e devolvemos no formato que os componentes já esperam.

import { apiServer } from '@/lib/server-api'
import type { CoursePlayerData, LessonQuizLoadResult } from '../types'

/**
 * Dados do player (curso, módulos/aulas publicados e progresso). `null` quando o curso não existe
 * ou a pessoa não tem matrícula ativa/concluída (a página redireciona).
 */
export async function getCoursePlayerData(
  _userId: string,
  courseSlug: string,
): Promise<CoursePlayerData | null> {
  const result = await apiServer<CoursePlayerData>(
    `/learning/courses/${encodeURIComponent(courseSlug)}/player`,
  )
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching course player data:', result.error.message)
    }
    return null
  }
  return result.data
}

/** Quiz da aula, SEM gabarito. Problemas de acesso/configuração voltam no `status`. */
export async function getLessonQuizData(
  _userId: string,
  courseId: number,
  lessonId: number,
): Promise<LessonQuizLoadResult> {
  const result = await apiServer<LessonQuizLoadResult>(`/learning/lessons/${lessonId}/quiz`, {
    query: { courseId },
  })
  if (!result.ok) {
    console.error('[quiz][load][error]', { lessonId, courseId, error: result.error.message })
    return { status: 'technical_error', detail: null, quiz: null }
  }
  return result.data
}
