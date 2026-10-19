import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).optional()

const positiveId = z.coerce.number().int().positive().max(2_147_483_647)
const commissionRate = z.coerce
  .number()
  .gt(0, 'Comissão deve ser maior que zero')
  .max(100, 'Comissão deve ser no máximo 100%')
const cookieWindowDays = z.coerce
  .number()
  .int('Janela deve ser um número inteiro de dias')
  .min(1, 'Janela deve ser de pelo menos 1 dia')
  .max(90, 'Janela deve ser de no máximo 90 dias')

export const idParamSchema = positiveId

/** Revisão de candidatura. Aprovar pode já criar a primeira parceria (curso + comissão + janela). */
export const reviewApplicationSchema = z
  .object({
    status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
    rejectionReason: optionalText(500),
    notes: optionalText(1000),
    partnershipCourseId: z.union([z.literal('').transform(() => undefined), positiveId]).optional(),
    partnershipCommissionRate: z.coerce.number().optional(),
    partnershipCookieWindowDays: z.coerce.number().optional(),
    partnershipNotes: optionalText(1000),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }

    if (values.status === 'approved' && values.partnershipCourseId) {
      const rate = values.partnershipCommissionRate
      if (!rate || rate <= 0 || rate > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['partnershipCommissionRate'],
          message: 'Informe uma comissão entre 0,01% e 100%',
        })
      }
      const days = values.partnershipCookieWindowDays
      if (!days || !Number.isInteger(days) || days < 1 || days > 90) {
        ctx.addIssue({
          code: 'custom',
          path: ['partnershipCookieWindowDays'],
          message: 'Informe uma janela entre 1 e 90 dias',
        })
      }
    }
  })
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>

export const upsertPartnershipSchema = z
  .object({
    partnershipId: positiveId.optional(),
    affiliateId: z.uuid('Afiliado inválido'),
    courseId: positiveId,
    commissionRate,
    cookieWindowDays,
    notes: optionalText(1000),
    status: z.enum(['pending', 'approved', 'rejected', 'revoked']).default('pending'),
    rejectionReason: optionalText(500),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason) {
      ctx.addIssue({
        code: 'custom',
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }
  })
export type UpsertPartnershipInput = z.infer<typeof upsertPartnershipSchema>

export const reviewPartnershipSchema = z.object({
  status: z.enum(['approved', 'rejected', 'revoked']),
  rejectionReason: optionalText(500),
})
export type ReviewPartnershipInput = z.infer<typeof reviewPartnershipSchema>
