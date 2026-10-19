'use server'

import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/course-create/lib/api-error'
import {
  completeCourseSchema,
  type CompleteCourseFormData,
} from '@/features/producer/course-create/types'
import {
  adminCourseEditorSettingsSchema,
  type AdminCourseEditorSettingsFormData,
} from '../lib/validations'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

interface CreateCompleteCourseByAdminInput {
  courseData: CompleteCourseFormData
  settings: AdminCourseEditorSettingsFormData
}

/** Assistente completo do admin: cria curso, currículo e quiz numa transação, já em revisão. */
export async function createCompleteCourseByAdminAction(input: CreateCompleteCourseByAdminInput) {
  try {
    // Validação no front é só para a mensagem; a API valida de novo e exige papel de admin.
    const courseData = completeCourseSchema.parse(input.courseData)
    const settings = adminCourseEditorSettingsSchema.parse(input.settings)

    const result = await apiServer<{ courseId: string }>('/admin/courses/complete', {
      body: { courseData, settings },
    })
    if (!result.ok) {
      return { success: false, error: apiErrorMessage(result.error, 'Falha ao criar curso') }
    }

    return { success: true, courseId: String(result.data.courseId) }
  } catch (error: unknown) {
    console.error('Error in createCompleteCourseByAdminAction:', error)

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos para criar curso',
      }
    }

    return {
      success: false,
      error: getErrorMessage(error, 'Falha ao criar curso'),
    }
  }
}
