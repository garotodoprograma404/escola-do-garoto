// =====================================================
// STUDENT PLAYER - REVIEW ACTIONS
// =====================================================
//
// Quem pode avaliar (só quem concluiu o curso), a avaliação única por matrícula e o recálculo da
// nota média são regras da API; aqui só se chama a rota e se traduz a resposta para a tela.

'use server'

import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import type { CourseReviewByStudent } from '../types'

const saveReviewSchema = z.object({
  courseId: z.number().int().positive(),
  rating: z.number().int().min(1, 'Escolha uma nota de 1 a 5').max(5, 'Escolha uma nota de 1 a 5'),
  title: z.string().trim().max(200, 'O título deve ter no máximo 200 caracteres'),
  review: z.string().trim().max(2000, 'O comentário deve ter no máximo 2000 caracteres'),
})

export async function getMyReviewAction(courseId: number): Promise<CourseReviewByStudent | null> {
  if (!Number.isInteger(courseId) || courseId <= 0) return null

  const result = await apiServer<{ review: CourseReviewByStudent | null }>(
    `/learning/courses/${courseId}/review`,
  )
  return result.ok ? result.data.review : null
}

export async function saveReviewAction(
  input: z.input<typeof saveReviewSchema>,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = saveReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Avaliação inválida' }
  }

  const { courseId, rating, title, review } = parsed.data
  const result = await apiServer(`/learning/courses/${courseId}/review`, {
    method: 'PUT',
    body: { rating, title: title || null, review: review || null },
  })
  if (result.ok) return { success: true }

  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  return { success: false, error: result.error.message || 'Não foi possível salvar a avaliação' }
}
