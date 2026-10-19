// =====================================================
// LESSON NOTES - SERVER ACTIONS
// =====================================================

'use server'

import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import type { LessonNote } from '../types'

const noteSchema = z.object({
  lessonId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  title: z.string().trim().min(1, 'Título é obrigatório').max(200),
  content: z.string().trim().min(1, 'Conteúdo é obrigatório'),
  videoTimestamp: z.number().int().min(0).nullable().optional(),
})

const getLessonNotesSchema = z.object({
  lessonId: z.number().int().positive(),
})

export async function getLessonNotesAction(
  input: z.infer<typeof getLessonNotesSchema>,
): Promise<
  { success: true; data: LessonNote[] } | { success: false; error: string; data?: undefined }
> {
  const parsed = getLessonNotesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Aula inválida' }
  }

  const result = await apiServer<LessonNote[]>(`/learning/lessons/${parsed.data.lessonId}/notes`)
  if (!result.ok) {
    console.error('Error loading notes:', result.error.message)
    return { success: false, error: 'Erro ao carregar anotações' }
  }
  return { success: true, data: result.data }
}

export async function createNoteAction(
  input: z.infer<typeof noteSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = noteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const result = await apiServer('/learning/notes', { method: 'POST', body: parsed.data })
  if (result.ok) return { success: true }

  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  console.error('Error creating note:', result.error.message)
  return { success: false, error: result.error.message || 'Erro ao criar anotação' }
}

export async function deleteNoteAction(
  noteId: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await apiServer(`/learning/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  })
  if (result.ok) return { success: true }

  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  console.error('Error deleting note:', result.error.message)
  return { success: false, error: 'Erro ao excluir anotação' }
}
