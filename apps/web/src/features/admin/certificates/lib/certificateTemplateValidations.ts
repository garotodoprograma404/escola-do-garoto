import { z } from 'zod'

const certificateOrientationSchema = z.enum(['landscape', 'portrait'])

const descriptionField = z
  .string()
  .trim()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')
  .optional()
  .or(z.literal(''))
  .transform((value) => {
    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  })

const pageSizeField = z
  .string()
  .trim()
  .min(1, 'Formato da página é obrigatório')
  .max(20, 'Formato da página deve ter no máximo 20 caracteres')
  .transform((value) => value.toUpperCase())

export const createCertificateTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no minimo 3 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres'),
  description: descriptionField,
  orientation: certificateOrientationSchema.default('landscape'),
  pageSize: pageSizeField.default('A4'),
})

export const updateCertificateTemplateSchema = z.object({
  templateId: z.coerce.number().int().positive('Template inválido'),
  name: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no minimo 3 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres'),
  description: descriptionField,
  orientation: certificateOrientationSchema,
  pageSize: pageSizeField,
})

export const mutateTemplateStatusSchema = z.object({
  templateId: z.coerce.number().int().positive('Template inválido'),
})

export type CreateCertificateTemplateInput = z.input<typeof createCertificateTemplateSchema>
export type UpdateCertificateTemplateInput = z.input<typeof updateCertificateTemplateSchema>
export type MutateTemplateStatusInput = z.input<typeof mutateTemplateStatusSchema>
