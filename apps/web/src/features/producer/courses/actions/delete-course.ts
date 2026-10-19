'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'

export async function deleteCourseAction(courseId: string) {
  const id = parseCourseId(courseId)
  if (!id) {
    return { error: 'Curso inválido' }
  }

  const result = await apiServer(`/producer/courses/${id}`, { method: 'DELETE' })
  if (!result.ok) {
    return { error: apiErrorMessage(result.error, 'Falha ao excluir curso') }
  }

  revalidatePath('/producer/courses')

  return { success: true }
}
