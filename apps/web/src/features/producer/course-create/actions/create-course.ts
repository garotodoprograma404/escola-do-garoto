'use server'

import { apiServer } from '@/lib/server-api'
import { completeCourseSchema, type CompleteCourseFormData } from '../types'
import { apiErrorMessage } from '../lib/api-error'

type CreateCourseResult =
  | {
      success: true
      courseId: number
    }
  | {
      success: false
      error: string
    }

/** Categorias ativas para o seletor do assistente. */
export async function getActiveCategoriesAction(): Promise<{ id: number; name: string }[]> {
  const result = await apiServer<{ id: number; name: string }[]>('/producer/courses/categories')
  if (!result.ok) {
    console.error('Error fetching categories:', result.error.message)
    return []
  }
  return result.data
}

/** Cria o curso completo (curso, módulos, aulas e quiz numa transação) já em revisão. */
export async function createCourseAction(
  data: CompleteCourseFormData,
): Promise<CreateCourseResult> {
  // Validação no front é só para mostrar a mensagem certa; a API valida de novo.
  const validation = completeCourseSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const result = await apiServer<{ courseId: number }>('/producer/courses', {
    body: validation.data,
  })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Erro inesperado ao criar curso'),
    }
  }
  return { success: true, courseId: result.data.courseId }
}

/** Salva o que já foi preenchido como rascunho (sem exigir o curso completo). */
export async function saveDraftAction(data: Partial<CompleteCourseFormData>) {
  const result = await apiServer<{ courseId: number }>('/producer/courses/drafts', { body: data })
  if (!result.ok) {
    return { error: apiErrorMessage(result.error, 'Falha ao salvar rascunho') }
  }
  return { success: true, courseId: result.data.courseId }
}
