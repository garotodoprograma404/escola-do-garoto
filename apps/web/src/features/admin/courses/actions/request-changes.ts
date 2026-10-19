'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requestChanges } from '../services/courseService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/** Pede alterações: o curso volta para rascunho (a API audita e avisa o produtor). */
export async function requestChangesAction(
  courseId: string,
  feedback: string,
  changesRequested: string[],
) {
  try {
    const result = await requestChanges(courseId, '', feedback, changesRequested)

    if (result.success) {
      revalidatePath('/admin/courses')
      revalidatePath('/')
      revalidateTag('home-public', 'max')
    }

    return result
  } catch (error: unknown) {
    console.error('Error in requestChangesAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao solicitar mudanças') }
  }
}
