import { z } from 'zod'

const TICKET_CATEGORIES = ['technical', 'billing', 'course_content', 'account', 'other'] as const
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const TICKET_STATUSES = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const

/** Aceita "course" como apelido da categoria "Conteúdo do Curso" (`course_content`). */
const categorySchema = z.preprocess(
  (value) => (value === 'course' ? 'course_content' : value),
  z.enum(TICKET_CATEGORIES),
)

export const createTicketSchema = z.object({
  title: z
    .string({ error: 'Informe o título' })
    .trim()
    .min(5, 'O título deve ter pelo menos 5 caracteres')
    .max(200, 'O título deve ter no máximo 200 caracteres'),
  description: z
    .string({ error: 'Informe a descrição' })
    .trim()
    .min(20, 'A descrição deve ter pelo menos 20 caracteres')
    .max(5000, 'A descrição deve ter no máximo 5000 caracteres'),
  category: categorySchema,
  priority: z.enum(TICKET_PRIORITIES),
  course_id: z.number().int().positive().nullable().optional(),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const sendTicketMessageSchema = z.object({
  message: z
    .string({ error: 'Mensagem inválida' })
    .trim()
    .min(1, 'A mensagem não pode estar vazia')
    .max(4000, 'Mensagem longa demais (máximo de 4000 caracteres)'),
})
export type SendTicketMessageInput = z.infer<typeof sendTicketMessageSchema>

export const adminTicketsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  category: categorySchema.optional(),
  /** `UNASSIGNED` = sem responsável; um uuid = tickets daquele atendente. */
  assignedTo: z.union([z.literal('UNASSIGNED'), z.uuid()]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})
export type AdminTicketsQuery = z.infer<typeof adminTicketsQuerySchema>

export const updateTicketStatusSchema = z.object({ status: z.enum(TICKET_STATUSES) })
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>

/** Sem `adminId`, quem atribui assume o ticket. */
export const assignTicketSchema = z.object({ adminId: z.uuid().optional() })
export type AssignTicketInput = z.infer<typeof assignTicketSchema>
