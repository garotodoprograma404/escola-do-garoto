'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { rejectCourse } from '../services/courseService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Rejeita o curso com o motivo (a API audita e avisa o produtor). */
export async function rejectCourseAction(courseId: string, reason: string) {
  try {
    const result = await rejectCourse(courseId, '', reason)

    if (result.success) {
      revalidatePath('/admin/courses')
      revalidatePath('/')
      revalidateTag('home-public', 'max')
    }

    return result
  } catch (error: unknown) {
    console.error('Error in rejectCourseAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao rejeitar curso') }
  }
}
