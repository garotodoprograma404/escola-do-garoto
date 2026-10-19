import { z } from 'zod'

/** Ids de ticket são `bigint` (número). Limitado ao que o JavaScript representa sem perder dígitos. */
export const ticketIdParamSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

export const sendChatMessageSchema = z.object({
  message: z
    .string({ error: 'Mensagem inválida' })
    .trim()
    .min(1, 'A mensagem não pode estar vazia')
    .max(4000, 'Mensagem longa demais (máximo de 4000 caracteres)'),
})
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>

export const typingSchema = z.object({ isTyping: z.boolean() })
export type TypingInput = z.infer<typeof typingSchema>

export const userIdParamSchema = z.uuid()

export const notificationIdParamSchema = z.uuid()

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unread: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
})
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
