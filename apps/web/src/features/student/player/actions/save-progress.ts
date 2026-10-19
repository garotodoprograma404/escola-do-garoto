// =====================================================
// SAVE LESSON PROGRESS - SERVER ACTION
// =====================================================

'use server'

import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

/** Mesmo teto da API (um dia): o player nunca passa disso, e o excedente é só ruído. */
const MAX_WATCH_SECONDS = 86_400

const saveProgressSchema = z.object({
  lessonId: z.number().int().positive(),
  watchTimeSeconds: z.number().int().min(0),
  completed: z.boolean().optional(),
})

type SaveProgressInput = z.infer<typeof saveProgressSchema>

export async function saveProgressAction(
  input: SaveProgressInput,
): Promise<{ success: boolean; error?: string }> {
  const parsed = saveProgressSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Dados inválidos de progresso',
    }
  }

  const { lessonId, watchTimeSeconds, completed } = parsed.data
  const result = await apiServer(`/learning/lessons/${lessonId}/progress`, {
    method: 'PUT',
    body: {
      watchTimeSeconds: Math.min(watchTimeSeconds, MAX_WATCH_SECONDS),
      ...(completed ? { completed: true } : {}),
    },
  })

  if (result.ok) return { success: true }
  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  console.error('Error saving progress:', result.error.message)
  return { success: false, error: result.error.message || 'Erro ao salvar progresso' }
}
