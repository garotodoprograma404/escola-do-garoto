'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { getApiErrorMessage } from '@/features/affiliate/lib/api-error'

const affiliateApplicationReviewSchema = z
  .object({
    applicationId: z.string().min(1, 'Candidatura inválida'),
    status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    partnershipCourseId: z.string().optional(),
    partnershipCommissionRate: z.coerce.number().optional(),
    partnershipCookieWindowDays: z.coerce.number().optional(),
    partnershipNotes: z.string().trim().max(1000).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }

    if (values.status === 'approved' && values.partnershipCourseId) {
      if (
        !values.partnershipCommissionRate ||
        values.partnershipCommissionRate <= 0 ||
        values.partnershipCommissionRate > 100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partnershipCommissionRate'],
          message: 'Informe uma comissão entre 0,01% e 100%',
        })
      }

      if (
        !values.partnershipCookieWindowDays ||
        !Number.isInteger(values.partnershipCookieWindowDays) ||
        values.partnershipCookieWindowDays < 1 ||
        values.partnershipCookieWindowDays > 90
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partnershipCookieWindowDays'],
          message: 'Informe uma janela entre 1 e 90 dias',
        })
      }
    }
  })

/**
 * Aprova, rejeita ou devolve para análise uma candidatura de afiliado. Quem confere se a pessoa
 * é admin, concede/revoga o papel `affiliate` e grava a auditoria é a API (tudo numa transação).
 */
export async function reviewAffiliateApplicationAction(input: unknown) {
  try {
    const validated = affiliateApplicationReviewSchema.parse(input)

    const applicationId = Number(validated.applicationId)
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return { success: false, error: 'Candidatura inválida' }
    }

    const result = await apiServer(`/admin/affiliates/applications/${applicationId}/review`, {
      method: 'POST',
      body: {
        status: validated.status,
        rejectionReason: validated.rejectionReason,
        notes: validated.notes,
        partnershipCourseId: validated.partnershipCourseId?.trim() || undefined,
        partnershipCommissionRate: validated.partnershipCommissionRate,
        partnershipCookieWindowDays: validated.partnershipCookieWindowDays,
        partnershipNotes: validated.partnershipNotes,
      },
    })

    if (!result.ok) {
      return { success: false, error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/afiliados')
    revalidatePath('/minha-conta/afiliado')
    revalidatePath('/affiliate')
    revalidatePath('/admin/affiliates')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao revisar candidatura',
    }
  }
}
