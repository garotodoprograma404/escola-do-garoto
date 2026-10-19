import { z } from 'zod'

const yesNoSchema = z.enum(['yes', 'no'])

export const producerLeadSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome completo').max(120, 'Nome muito longo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um e-mail valido')
    .max(160, 'E-mail muito longo'),
  phone: z
    .string()
    .trim()
    .transform((value) => {
      const digits = value.replace(/\D/g, '')
      if (digits.startsWith('55') && digits.length > 11) {
        return digits.slice(2)
      }
      return digits
    })
    .refine((value) => value.length === 10 || value.length === 11, {
      message: 'Informe um WhatsApp válido com DDD',
    }),
  city: z.string().trim().min(2, 'Informe a cidade').max(120, 'Cidade muito longa'),
  hasInternetExperience: yesNoSchema,
  hasRecordedContent: yesNoSchema,
  topic: z
    .string()
    .trim()
    .max(160, 'Resumo do tema muito longo')
    .optional()
    .or(z.literal(''))
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(500, 'Mensagem muito longa')
    .optional()
    .or(z.literal(''))
    .transform((value) => value || null),
})
