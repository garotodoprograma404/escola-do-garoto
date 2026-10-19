'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/apiError'

const issueCertificateSchema = z.object({
  enrollmentId: z.coerce.number().int().positive('Matrícula inválida'),
  source: z.string().trim().max(120, 'Origem muito longa').optional(),
})

interface IssueCertificateActionSuccess {
  success: true
  status: 'issued' | 'already_exists'
  certificateId?: number
  certificateCode?: string
  reason?: string
}

interface IssueCertificateActionError {
  success: false
  status?: 'failed' | 'skipped'
  error: string
}

export type IssueCertificateActionResult =
  IssueCertificateActionSuccess | IssueCertificateActionError

interface IssueCertificateApiResponse {
  status: 'issued' | 'already_exists'
  certificateId?: number
  certificateCode?: string
  reason?: string
}

export async function issueCertificateForEnrollmentAction(
  input: unknown,
): Promise<IssueCertificateActionResult> {
  try {
    const parsed = issueCertificateSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para emissão manual',
      }
    }

    // A API confere o papel admin e quem emitiu é sempre o usuário da sessão.
    const result = await apiServer<IssueCertificateApiResponse>('/certificates/issue', {
      method: 'POST',
      body: parsed.data,
    })

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível emitir o certificado'),
      }
    }

    revalidatePath('/admin/certificates')
    revalidatePath('/admin/courses')
    revalidatePath('/student')
    revalidatePath('/student/courses')
    revalidatePath('/student/certificates')

    return {
      success: true,
      status: result.data.status,
      certificateId: result.data.certificateId,
      certificateCode: result.data.certificateCode,
      reason: result.data.reason,
    }
  } catch (error: unknown) {
    console.error('Error in issueCertificateForEnrollmentAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao emitir certificado',
    }
  }
}
