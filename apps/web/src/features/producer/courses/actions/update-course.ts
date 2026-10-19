'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import {
  completeCourseSchema,
  type CompleteCourseFormData,
} from '@/features/producer/course-create/types'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'

interface UpdateCourseResult {
  success: boolean
  error?: string
}

interface UpdateCourseOptions {
  skipCurriculumUpdate?: boolean
}

/**
 * Salva a edição do curso. A API só deixa o dono editar, recusa curso arquivado, respeita preço
 * travado pelo admin e manda curso aprovado de volta para revisão.
 */
export async function updateCourseAction(
  courseId: string,
  data: CompleteCourseFormData,
  options?: UpdateCourseOptions,
): Promise<UpdateCourseResult> {
  // Validação no front é só para mostrar a mensagem certa; a API valida de novo.
  const validation = completeCourseSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  const id = parseCourseId(courseId)
  if (!id) {
    return { success: false, error: 'Curso inválido' }
  }

  const result = await apiServer(`/producer/courses/${id}`, {
    method: 'PUT',
    body: { data: validation.data, options },
  })
  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Falha ao atualizar curso') }
  }

  revalidatePath('/producer/courses')
  revalidatePath('/admin/courses')
  revalidatePath('/')
  revalidateTag('home-public', 'max')

  return { success: true }
}
