// Student Support Service: tudo vem da API (`/api/support/*`), sempre filtrado pela pessoa logada.
import { apiServer } from '@/lib/server-api'
import type { SupportTicket, TicketMessage, SupportStats } from '../types'
import { normalizeSupportTicketStatus } from '../lib/ticket-status'

const EMPTY_STATS: SupportStats = {
  total_tickets: 0,
  open_tickets: 0,
  resolved_tickets: 0,
  average_response_time: 0,
}

// O `userId` que as páginas ainda passam é ignorado: a API usa sempre o usuário da sessão, então
// ninguém consegue pedir os tickets de outra pessoa trocando esse valor.

export async function getMyTickets(_userId?: string): Promise<SupportTicket[]> {
  const result = await apiServer<SupportTicket[]>('/support/tickets')
  if (!result.ok) {
    console.error('Error fetching tickets:', result.error.message)
    return []
  }
  return result.data.map((ticket) => ({
    ...ticket,
    status: normalizeSupportTicketStatus(ticket.status),
  }))
}

export async function getTicket(ticketId: string, _userId?: string): Promise<SupportTicket | null> {
  const id = Number(ticketId)
  if (!Number.isSafeInteger(id) || id <= 0) return null

  const result = await apiServer<SupportTicket>(`/support/tickets/${id}`)
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching ticket:', result.error.message)
    }
    return null
  }
  return { ...result.data, status: normalizeSupportTicketStatus(result.data.status) }
}

export async function getTicketMessages(
  ticketId: string,
  _userId?: string,
): Promise<TicketMessage[]> {
  const id = Number(ticketId)
  if (!Number.isSafeInteger(id) || id <= 0) return []

  const result = await apiServer<TicketMessage[]>(`/support/tickets/${id}/messages`)
  if (!result.ok) {
    console.error('Error fetching messages:', result.error.message)
    return []
  }
  return result.data
}

export async function getSupportStats(_userId?: string): Promise<SupportStats> {
  const result = await apiServer<SupportStats>('/support/tickets/stats')
  if (!result.ok) return EMPTY_STATS
  return result.data
}

/** Cursos em que a pessoa está matriculada (opções do formulário "novo ticket"). */
export async function getMyCoursesForSupport(): Promise<Array<{ id: string; title: string }>> {
  const result = await apiServer<Array<{ id: string; title: string }>>('/support/my-courses')
  return result.ok ? result.data : []
}
