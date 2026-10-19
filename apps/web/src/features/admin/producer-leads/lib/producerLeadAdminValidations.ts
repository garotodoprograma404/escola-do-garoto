import { z } from 'zod'

const producerLeadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'archived'])

export const updateProducerLeadSchema = z.object({
  leadId: z.coerce.number().int().positive('Lead inválido'),
  status: producerLeadStatusSchema,
  adminNotes: z
    .string()
    .trim()
    .max(2000, 'Observacoes internas devem ter no maximo 2000 caracteres')
    .optional()
    .or(z.literal(''))
    .transform((value) =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : null,
    ),
})

export type UpdateProducerLeadInput = z.input<typeof updateProducerLeadSchema>
