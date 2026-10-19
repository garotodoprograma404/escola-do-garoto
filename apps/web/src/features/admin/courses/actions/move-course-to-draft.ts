'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'
import { moveCourseToDraftSchema, type MoveCourseToDraftFormData } from '../lib/validations'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Devolve o curso para rascunho (a API exige admin, audita e avisa o produtor). */
export async function moveCourseToDraftAction(
  courseId: string,
  data: MoveCourseToDraftFormData = {},
) {
  try {
    const validatedData = moveCourseToDraftSchema.parse(data)
    const id = parseCourseId(courseId)

    if (!id) {
      return { success: false, error: 'Curso inválido' }
    }

    const result = await apiServer(`/admin/courses/${id}/move-to-draft`, {
      method: 'POST',
      body: { reason: validatedData.reason?.trim() || undefined },
    })
    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Erro ao mover curso para rascunho'),
      }
    }

    revalidatePath('/admin/courses')
    revalidatePath('/producer/courses')
    revalidatePath('/')
    revalidateTag('home-public', 'max')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in moveCourseToDraftAction:', error)

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos',
      }
    }

    return {
      success: false,
      error: getErrorMessage(error, 'Erro ao mover curso para rascunho'),
    }
  }
}
