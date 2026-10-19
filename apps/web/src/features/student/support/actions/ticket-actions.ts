'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const ticketCategoryValues = ['technical', 'billing', 'course_content', 'account', 'other'] as const
const ticketPriorityValues = ['low', 'medium', 'high', 'urgent'] as const

const createTicketSchema = z.object({
  title: z.string().trim().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z.string().trim().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  category: z.enum(ticketCategoryValues),
  priority: z.enum(ticketPriorityValues),
  course_id: z.number().int().positive().nullable().optional(),
})

const sendMessageSchema = z.object({
  ticket_id: z.coerce.number().int().positive('Ticket inválido'),
  message: z.string().trim().min(1, 'Mensagem não pode estar vazia'),
})

/**
 * Abre um ticket para a pessoa logada. A API grava o dono a partir da sessão (nunca de um campo
 * do formulário) e só aceita curso em que a pessoa está matriculada.
 */
export async function createTicket(formData: FormData) {
  const rawCategory = formData.get('category')
  const normalizedCategory = rawCategory === 'course' ? 'course_content' : rawCategory

  const rawCourseId = formData.get('course_id')
  const normalizedCourseId =
    typeof rawCourseId === 'string' && rawCourseId.trim().length > 0 ? Number(rawCourseId) : null

  const parsed = createTicketSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    category: normalizedCategory,
    priority: formData.get('priority'),
    course_id: normalizedCourseId,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const result = await apiServer<{ id: string }>('/support/tickets', { body: parsed.data })
  if (!result.ok) {
    return { success: false, error: result.error.message || 'Erro ao criar ticket' }
  }

  revalidatePath('/student/support')
  redirect(`/student/support/${result.data.id}`)
}

export async function sendMessage(formData: FormData) {
  const parsed = sendMessageSchema.safeParse({
    ticket_id: formData.get('ticket_id'),
    message: formData.get('message'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const result = await apiServer<void>(`/support/tickets/${parsed.data.ticket_id}/messages`, {
    body: { message: parsed.data.message },
  })
  if (!result.ok) {
    const closed = result.error.statusCode === 409
    return {
      success: false,
      error: closed ? 'Ticket esta fechado' : 'Erro ao enviar mensagem',
    }
  }

  revalidatePath(`/student/support/${parsed.data.ticket_id}`)
  return { success: true }
}

export async function closeTicket(ticketId: string) {
  const parsed = z.coerce.number().int().positive('Ticket inválido').safeParse(ticketId)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const result = await apiServer<void>(`/support/tickets/${parsed.data}/close`, { method: 'POST' })
  if (!result.ok) {
    return { success: false, error: 'Erro ao fechar ticket' }
  }

  revalidatePath(`/student/support/${parsed.data}`)
  revalidatePath('/student/support')
  return { success: true }
}
