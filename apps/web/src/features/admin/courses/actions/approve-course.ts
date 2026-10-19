'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { approveCourse } from '../services/courseService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Aprova o curso. A API confere se quem chama é admin, publica o curso, grava a auditoria,
 * avisa o produtor e registra no log do admin (tudo numa transação).
 */
export async function approveCourseAction(courseId: string, feedback?: string) {
  try {
    const result = await approveCourse(courseId, '', feedback)

    if (result.success) {
      revalidatePath('/admin/courses')
      revalidatePath('/')
      revalidateTag('home-public', 'max')
    }

    return result
  } catch (error: unknown) {
    console.error('Error in approveCourseAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao aprovar curso') }
  }
}
