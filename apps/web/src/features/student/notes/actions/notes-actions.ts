// =====================================================
// STUDENT NOTES - SERVER ACTIONS (API NestJS: /api/learning/notes)
// =====================================================

'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import type { NoteFormData } from '../types'

type ActionResult = { success: boolean; error?: string }

/**
 * Cria uma nova nota. A API exige matrícula no curso e que a aula seja desse curso.
 */
export async function createNote(
  lessonId: string,
  courseId: string,
  data: NoteFormData,
): Promise<ActionResult> {
  const result = await apiServer('/learning/notes', {
    method: 'POST',
    body: {
      lessonId: Number(lessonId),
      courseId: Number(courseId),
      title: data.title,
      content: data.content,
      videoTimestamp: data.video_timestamp || null,
    },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    console.error('Error creating note:', result.error.message)
    return { success: false, error: 'Erro ao criar nota' }
  }

  revalidatePath('/student/notes')
  return { success: true }
}

/**
 * Atualiza uma nota existente (só a própria)
 */
export async function updateNote(noteId: string, data: NoteFormData): Promise<ActionResult> {
  const result = await apiServer(`/learning/notes/${encodeURIComponent(noteId)}`, {
    method: 'PATCH',
    body: {
      title: data.title,
      content: data.content,
      videoTimestamp: data.video_timestamp || null,
    },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    console.error('Error updating note:', result.error.message)
    return { success: false, error: 'Erro ao atualizar nota' }
  }

  revalidatePath('/student/notes')
  return { success: true }
}

/**
 * Deleta uma nota (só a própria)
 */
export async function deleteNote(noteId: string): Promise<ActionResult> {
  const result = await apiServer(`/learning/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    console.error('Error deleting note:', result.error.message)
    return { success: false, error: 'Erro ao deletar nota' }
  }

  revalidatePath('/student/notes')
  return { success: true }
}
