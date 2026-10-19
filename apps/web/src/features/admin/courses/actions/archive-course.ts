'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { archiveCourse } from '../services/courseService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Arquiva o curso (a API exige admin, audita e avisa o produtor). */
export async function archiveCourseAction(courseId: string, reason?: string) {
  try {
    const result = await archiveCourse(courseId, reason)

    if (result.success) {
      revalidatePath('/admin/courses')
      revalidatePath('/producer/courses')
      revalidatePath('/')
      revalidateTag('home-public', 'max')
    }

    return result
  } catch (error: unknown) {
    console.error('Error in archiveCourseAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao arquivar curso') }
  }
}
