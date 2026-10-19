'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/apiError'
import type { AdminCourseEnrollment } from '../services/certificateCourseService'

const bindTemplateSchema = z.object({
  courseId: z.coerce.number().int().positive('Curso inválido'),
  templateId: z.coerce.number().int().positive('Template inválido'),
})

type BindResult = { success: true } | { success: false; error: string }

/** Liga o modelo publicado ao curso: a partir daí, quem conclui o curso recebe o certificado. */
export async function bindCertificateTemplateAction(input: unknown): Promise<BindResult> {
  const parsed = bindTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos' }
  }

  const { courseId, templateId } = parsed.data
  const result = await apiServer(`/certificates/courses/${courseId}/template`, {
    method: 'PUT',
    body: { templateId },
  })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível ligar o template ao curso'),
    }
  }

  revalidatePath('/admin/certificates')
  return { success: true }
}

const courseIdSchema = z.coerce.number().int().positive()

/** Matrículas do curso escolhido, para a emissão manual. */
export async function getCourseEnrollmentsAction(
  courseId: unknown,
): Promise<
  { success: true; enrollments: AdminCourseEnrollment[] } | { success: false; error: string }
> {
  const parsed = courseIdSchema.safeParse(courseId)
  if (!parsed.success) return { success: false, error: 'Curso inválido' }

  const result = await apiServer<AdminCourseEnrollment[]>(
    `/certificates/courses/${parsed.data}/enrollments`,
  )
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível carregar as matrículas'),
    }
  }
  return { success: true, enrollments: result.data }
}
