'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/apiError'

const revokeCertificateSchema = z.object({
  certificateId: z.coerce.number().int().positive('Certificado inválido'),
  reason: z.string().trim().min(5, 'Informe o motivo da revogação').max(500, 'Motivo muito longo'),
})

const reissueCertificateSchema = z.object({
  certificateId: z.coerce.number().int().positive('Certificado inválido'),
  reason: z
    .string()
    .trim()
    .max(500, 'Observação muito longa')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

interface ActionSuccess {
  success: true
  message: string
  certificateId?: number
  certificateCode?: string
}

interface ActionError {
  success: false
  error: string
}

type ActionResult = ActionSuccess | ActionError

function revalidateOperationsPaths() {
  revalidatePath('/admin/certificates')
  revalidatePath('/student')
  revalidatePath('/student/certificates')
  revalidatePath('/student/courses')
}

// A autorização (papel admin) e todas as regras (só ativo revoga, um ativo por matrícula, eventos)
// ficam na API; aqui só chamamos e traduzimos a resposta para o formato que a tela já usa.

export async function revokeIssuedCertificateAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = revokeCertificateSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para revogar certificado',
      }
    }

    const { certificateId, reason } = parsed.data
    const result = await apiServer<{ certificateId: number }>(
      `/certificates/${certificateId}/revoke`,
      {
        method: 'POST',
        body: { reason },
      },
    )

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível revogar o certificado agora'),
      }
    }

    revalidateOperationsPaths()

    return {
      success: true,
      message: 'Certificado revogado com sucesso',
      certificateId: result.data.certificateId,
    }
  } catch (error: unknown) {
    console.error('Error in revokeIssuedCertificateAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao revogar certificado',
    }
  }
}

export async function reissueCertificateAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = reissueCertificateSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para reemitir certificado',
      }
    }

    const { certificateId, reason } = parsed.data
    const result = await apiServer<{ certificateId: number; certificateCode: string | null }>(
      `/certificates/${certificateId}/reissue`,
      { method: 'POST', body: { reason } },
    )

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível reemitir o certificado'),
      }
    }

    revalidateOperationsPaths()

    return {
      success: true,
      message: 'Certificado reemitido com sucesso',
      certificateId: result.data.certificateId,
      certificateCode: result.data.certificateCode ?? undefined,
    }
  } catch (error: unknown) {
    console.error('Error in reissueCertificateAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reemitir certificado',
    }
  }
}
