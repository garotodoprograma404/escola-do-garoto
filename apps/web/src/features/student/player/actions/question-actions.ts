// =====================================================
// STUDENT PLAYER - QUESTION ACTIONS
// =====================================================

'use server'

import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import type { LessonQuestion } from '../types'

const askQuestionSchema = z.object({
  courseId: z.number().int().positive(),
  lessonId: z.number().int().positive(),
  question: z
    .string()
    .trim()
    .min(10, 'A pergunta deve ter pelo menos 10 caracteres')
    .max(2000, 'A pergunta deve ter no máximo 2000 caracteres'),
  isPublic: z.boolean().default(true),
})

interface AskQuestionInput {
  courseId: number
  lessonId: number
  question: string
  isPublic?: boolean
}

const getQuestionsSchema = z.object({
  courseId: z.number().int().positive(),
  lessonId: z.number().int().positive(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(20),
})

export async function getLessonQuestionsAction(
  input: z.input<typeof getQuestionsSchema>,
): Promise<
  | { success: true; data: { questions: LessonQuestion[]; hasMore: boolean; nextOffset: number } }
  | { success: false; error: string; data?: undefined }
> {
  const parsed = getQuestionsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Parâmetros inválidos' }
  }

  const { courseId, lessonId, offset, limit } = parsed.data
  const result = await apiServer<{
    questions: LessonQuestion[]
    hasMore: boolean
    nextOffset: number
  }>(`/learning/courses/${courseId}/lessons/${lessonId}/questions`, { query: { offset, limit } })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    if (result.error.statusCode === 403) {
      return { success: false, error: 'Você não está matriculado neste curso' }
    }
    console.error('Get lesson questions error:', result.error.message)
    return { success: false, error: 'Erro ao carregar perguntas' }
  }
  return { success: true, data: result.data }
}

export async function askQuestionAction(
  input: AskQuestionInput,
): Promise<{ success: boolean; error?: string }> {
  const parsed = askQuestionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Pergunta inválida' }
  }

  const result = await apiServer('/learning/questions', { method: 'POST', body: parsed.data })
  if (result.ok) return { success: true }

  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  console.error('Ask question error:', result.error.message)
  return { success: false, error: result.error.message || 'Erro ao processar pergunta' }
}
