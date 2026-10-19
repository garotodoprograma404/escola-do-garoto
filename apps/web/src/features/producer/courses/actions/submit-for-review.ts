'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'

interface SubmitForReviewResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Envia o curso para a fila do admin. As conferências (módulos, aulas, URLs, quiz) e a troca de
 * status são feitas pela API.
 */
export async function submitCourseForReviewAction(
  courseId: string,
): Promise<SubmitForReviewResult> {
  const id = parseCourseId(courseId)
  if (!id) {
    return { success: false, error: 'Curso inválido.' }
  }

  const result = await apiServer<{ message: string }>(`/producer/courses/${id}/submit`, {
    method: 'POST',
  })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Falha ao enviar curso para revisão.'),
    }
  }

  revalidatePath('/producer/courses')
  revalidatePath(`/producer/courses/${courseId}/edit`)
  revalidatePath('/admin/courses')
  revalidatePath('/')
  revalidateTag('home-public', 'max')

  return { success: true, message: result.data.message }
}
