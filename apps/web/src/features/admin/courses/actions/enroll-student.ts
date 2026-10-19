'use server'

import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'
import { enrollStudentSchema, type EnrollStudentFormData } from '../lib/validations'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Matrícula manual (sem pagamento). A API exige admin e cria o papel de aluno se faltar. */
export async function enrollStudentInCourseAction(data: EnrollStudentFormData) {
  try {
    const validated = enrollStudentSchema.parse(data)
    const courseId = parseCourseId(validated.courseId)

    if (!courseId) {
      return { success: false, error: 'Curso inválido' }
    }

    const result = await apiServer(`/admin/courses/${courseId}/enroll`, {
      method: 'POST',
      body: { studentId: validated.studentId },
    })
    if (!result.ok) {
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao matricular aluno') }
    }

    revalidatePath('/admin/courses')
    revalidatePath('/producer/courses')
    revalidatePath('/student/courses')
    revalidatePath('/student')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in enrollStudentInCourseAction:', error)

    if (error instanceof ZodError) {
      return {
        success: false,
        error: error.errors[0]?.message || 'Dados inválidos para matrícula',
      }
    }

    return {
      success: false,
      error: getErrorMessage(error, 'Erro ao matricular aluno'),
    }
  }
}
