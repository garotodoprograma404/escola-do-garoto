import { emailSchema } from '@vox/contracts'
import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null)

const httpUrl = z
  .string()
  .trim()
  .max(500, 'URL muito longa')
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'URL inválida')

/** Telefone só com dígitos (DDD + número), sem o 55 do país. */
const phoneSchema = z
  .string({ error: 'Informe um WhatsApp válido com DDD' })
  .trim()
  .transform((value) => {
    const digits = value.replace(/\D/g, '')
    return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  })
  .refine(
    (value) => value.length === 10 || value.length === 11,
    'Informe um WhatsApp válido com DDD',
  )

/** Contato público ("seja produtor"): visitante sem login. */
export const createLeadSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome completo').max(120, 'Nome muito longo'),
  email: emailSchema.pipe(z.string().max(160, 'E-mail muito longo')),
  phone: phoneSchema,
  city: z.string().trim().min(2, 'Informe a cidade').max(120, 'Cidade muito longa'),
  hasOnlineExperience: z.boolean(),
  hasRecordedContent: z.boolean(),
  topic: optionalText(160),
  notes: optionalText(500),
})
export type CreateLeadInput = z.infer<typeof createLeadSchema>

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'archived'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  adminNotes: optionalText(2000),
})
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

export const leadParamsSchema = z.object({ id: z.coerce.number().int().positive('Lead inválido') })

/** Candidatura formal de uma conta logada a produtor (`producer_applications`). */
export const createApplicationSchema = z.object({
  name: z.string().trim().min(3, 'Nome completo deve ter no mínimo 3 caracteres').max(120),
  email: emailSchema.optional(),
  phone: z.string().trim().min(10, 'Telefone inválido').max(20, 'Telefone inválido'),
  cpf: z.string().trim().min(11, 'CPF inválido').max(14, 'CPF inválido'),
  expertiseArea: z
    .string()
    .trim()
    .min(3, 'Área de especialização deve ter no mínimo 3 caracteres')
    .max(120),
  experienceYears: z
    .number()
    .int()
    .min(0, 'Anos de experiência deve ser maior ou igual a 0')
    .max(80),
  bio: z.string().trim().min(50, 'Biografia deve ter no mínimo 50 caracteres').max(2000),
  portfolioUrl: httpUrl.optional().or(z.literal('')),
  socialLinks: z
    .object({
      instagram: httpUrl.or(z.literal('')).optional(),
      youtube: httpUrl.or(z.literal('')).optional(),
      linkedin: httpUrl.or(z.literal('')).optional(),
      website: httpUrl.or(z.literal('')).optional(),
    })
    .optional(),
  whyProduce: z.string().trim().min(50, 'Resposta deve ter no mínimo 50 caracteres').max(2000),
})
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

const APPLICATION_STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const

export const listApplicationsQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
})
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>

export const applicationParamsSchema = z.object({
  id: z.coerce.number().int().positive('Candidatura inválida'),
})

export const reviewApplicationSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rejectionReason: optionalText(1000),
})
export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>
