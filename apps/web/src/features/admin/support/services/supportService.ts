import { apiServer } from '@/lib/server-api'
import type { Ticket, TicketMessage, TicketContext, SupportStats, TicketFilters } from '../types'

/**
 * Central de suporte da equipe. Tudo vem da API (`/api/admin/support/*`), que só atende admin e já
 * devolve os tickets no formato que as telas usam. A conversa em tempo real fica em `features/chat`.
 */

const EMPTY_STATS: SupportStats = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  resolvedToday: 0,
  averageResponseTime: 0,
  satisfactionRate: 0,
}

function ticketPath(ticketId: string): `/${string}` {
  return `/admin/support/tickets/${encodeURIComponent(ticketId.trim())}`
}

export async function getSupportStats(): Promise<SupportStats> {
  const result = await apiServer<SupportStats>('/admin/support/stats')
  if (!result.ok) {
    console.error('Error fetching support stats:', result.error.message)
    return EMPTY_STATS
  }
  return result.data
}

export async function getTickets(filters: TicketFilters): Promise<Ticket[]> {
  const result = await apiServer<Ticket[]>('/admin/support/tickets', {
    query: {
      search: filters.searchTerm.trim() || undefined,
      status: filters.status === 'ALL' ? undefined : filters.status,
      priority: filters.priority === 'ALL' ? undefined : filters.priority,
      category: filters.category === 'ALL' ? undefined : filters.category,
      assignedTo: filters.assignedTo === 'ALL' ? undefined : filters.assignedTo,
    },
  })
  if (!result.ok) {
    console.error('Error fetching tickets:', result.error.message)
    throw new Error('Erro ao buscar tickets')
  }
  return result.data
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const result = await apiServer<Ticket>(ticketPath(id))
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching ticket:', result.error.message)
    }
    return null
  }
  return result.data
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const result = await apiServer<TicketMessage[]>(`${ticketPath(ticketId)}/messages`)
  if (!result.ok) {
    console.error('Error fetching ticket messages:', result.error.message)
    return []
  }
  return result.data
}

export async function getTicketContext(ticketId: string): Promise<TicketContext> {
  const result = await apiServer<TicketContext>(`${ticketPath(ticketId)}/context`)
  if (!result.ok) throw new Error('Ticket não encontrado')
  return result.data
}
