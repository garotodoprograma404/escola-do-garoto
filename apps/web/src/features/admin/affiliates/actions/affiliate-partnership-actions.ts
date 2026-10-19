'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { getApiErrorMessage } from '@/features/affiliate/lib/api-error'

const partnershipUpsertSchema = z
  .object({
    partnershipId: z.string().optional(),
    affiliateId: z.string().uuid('Afiliado inválido'),
    courseId: z.string().min(1, 'Curso obrigatório'),
    commissionRate: z.coerce
      .number()
      .gt(0, 'Comissão deve ser maior que zero')
      .max(100, 'Comissão deve ser no máximo 100%'),
    cookieWindowDays: z.coerce
      .number()
      .int()
      .min(1, 'Janela deve ser de pelo menos 1 dia')
      .max(90, 'Janela deve ser de no máximo 90 dias'),
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'revoked']).default('pending'),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }
  })

const partnershipReviewSchema = z.object({
  partnershipId: z.string().min(1, 'Parceria inválida'),
  status: z.enum(['approved', 'rejected', 'revoked']),
  rejectionReason: z.string().trim().max(500).optional(),
})

/** Cria ou atualiza uma parceria afiliado × curso. A API exige admin e grava a auditoria. */
export async function upsertAffiliatePartnershipAction(input: unknown) {
  try {
    const validated = partnershipUpsertSchema.parse(input)

    const result = await apiServer('/admin/affiliates/partnerships', {
      method: 'PUT',
      body: {
        partnershipId: validated.partnershipId?.trim() || undefined,
        affiliateId: validated.affiliateId,
        courseId: validated.courseId,
        commissionRate: validated.commissionRate,
        cookieWindowDays: validated.cookieWindowDays,
        notes: validated.notes,
        status: validated.status,
        rejectionReason: validated.rejectionReason,
      },
    })

    if (!result.ok) {
      return { success: false, error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/admin/affiliates')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar parceria',
    }
  }
}

export async function reviewAffiliatePartnershipAction(input: unknown) {
  try {
    const validated = partnershipReviewSchema.parse(input)

    const partnershipId = Number(validated.partnershipId)
    if (!Number.isInteger(partnershipId) || partnershipId <= 0) {
      return { success: false, error: 'Parceria inválida' }
    }

    const result = await apiServer(`/admin/affiliates/partnerships/${partnershipId}/review`, {
      method: 'POST',
      body: { status: validated.status, rejectionReason: validated.rejectionReason },
    })

    if (!result.ok) {
      return { success: false, error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/admin/affiliates')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao revisar parceria',
    }
  }
}
