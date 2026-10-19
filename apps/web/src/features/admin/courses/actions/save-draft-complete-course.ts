'use server'

import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/course-create/lib/api-error'
import { type CompleteCourseFormData } from '@/features/producer/course-create/types'
import {
  adminCourseEditorSettingsSchema,
  type AdminCourseEditorSettingsFormData,
} from '../lib/validations'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

interface SaveDraftCompleteCourseByAdminInput {
  courseData: Partial<CompleteCourseFormData>
  settings: AdminCourseEditorSettingsFormData
}

/** Salva o que já foi preenchido como rascunho (aceita curso incompleto). */
export async function saveDraftCompleteCourseByAdminAction(
  input: SaveDraftCompleteCourseByAdminInput,
) {
  try {
    const settings = adminCourseEditorSettingsSchema.parse(input.settings)

    const result = await apiServer<{ courseId: string }>('/admin/courses/drafts', {
      body: { courseData: input.courseData, settings },
    })
    if (!result.ok) {
      return { success: false, error: apiErrorMessage(result.error, 'Falha ao salvar rascunho') }
    }

    return { success: true, courseId: String(result.data.courseId) }
  } catch (error: unknown) {
    console.error('Error in saveDraftCompleteCourseByAdminAction:', error)

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos para salvar rascunho',
      }
    }

    return {
      success: false,
      error: getErrorMessage(error, 'Falha ao salvar rascunho'),
    }
  }
}
