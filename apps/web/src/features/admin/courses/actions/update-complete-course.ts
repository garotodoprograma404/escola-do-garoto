'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'
import {
  completeCourseSchema,
  type CompleteCourseFormData,
} from '@/features/producer/course-create/types'
import {
  adminCourseEditorSettingsSchema,
  type AdminCourseEditorSettingsFormData,
} from '../lib/validations'

interface UpdateCourseOptions {
  skipCurriculumUpdate?: boolean
}

interface UpdateCompleteCourseByAdminInput {
  courseId: string
  courseData: CompleteCourseFormData
  settings: AdminCourseEditorSettingsFormData
  options?: UpdateCourseOptions
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Salva o assistente completo de um curso existente (qualquer dono). A API exige papel de admin. */
export async function updateCompleteCourseByAdminAction(input: UpdateCompleteCourseByAdminInput) {
  try {
    const courseData = completeCourseSchema.parse(input.courseData)
    const settings = adminCourseEditorSettingsSchema.parse(input.settings)

    const id = parseCourseId(input.courseId)
    if (!id) {
      return { success: false, error: 'Curso inválido' }
    }

    const result = await apiServer<{ success: boolean; slug?: string }>(
      `/admin/courses/${id}/complete`,
      { method: 'PUT', body: { courseData, settings, options: input.options } },
    )
    if (!result.ok) {
      return { success: false, error: apiErrorMessage(result.error, 'Falha ao atualizar curso') }
    }

    revalidatePath('/admin/courses')
    revalidatePath('/producer/courses')
    revalidatePath('/')
    revalidatePath('/catalog')
    if (result.data.slug) {
      revalidatePath(`/courses/${result.data.slug}`)
    }
    revalidateTag('home-public', 'max')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in updateCompleteCourseByAdminAction:', error)

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos para atualizar curso',
      }
    }

    return {
      success: false,
      error: getErrorMessage(error, 'Falha ao atualizar curso'),
    }
  }
}
