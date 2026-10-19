'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import type { Ticket, TicketStatus } from '../types'

const ticketStatusSchema = z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
const ticketIdSchema = z.coerce.number().int().positive()

/**
 * Troca o status do ticket. Quem confere se a pessoa é admin é a API.
 */
export async function updateTicketStatusAction(ticketId: string, status: TicketStatus) {
  const parsedTicketId = ticketIdSchema.safeParse(ticketId)
  if (!parsedTicketId.success) {
    return { success: false, error: 'Ticket inválido' }
  }

  const parsedStatus = ticketStatusSchema.safeParse(status)
  if (!parsedStatus.success) {
    return { success: false, error: 'Status inválido' }
  }

  const result = await apiServer<Ticket>(`/admin/support/tickets/${parsedTicketId.data}/status`, {
    method: 'PATCH',
    body: { status: parsedStatus.data },
  })
  if (!result.ok) {
    const forbidden = result.error.statusCode === 401 || result.error.statusCode === 403
    return {
      success: false,
      error: forbidden
        ? 'Sem permissao para atualizar ticket'
        : 'Não foi possível atualizar o status do ticket',
    }
  }

  revalidatePath('/admin/support')
  revalidatePath(`/admin/support/${parsedTicketId.data}`)
  revalidatePath(`/student/support/${parsedTicketId.data}`)
  return { success: true }
}
