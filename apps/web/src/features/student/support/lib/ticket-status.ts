import type { SupportTicket } from '../types'

export type SupportTicketStatus = SupportTicket['status']

const SUPPORT_TICKET_STATUSES: readonly SupportTicketStatus[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
]

export const STUDENT_SUPPORT_STATUS_COLORS: Record<SupportTicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

export const STUDENT_SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Progresso',
  waiting_customer: 'Aguardando Cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const STUDENT_CLOSABLE_STATUSES: readonly SupportTicketStatus[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
]

function isSupportTicketStatus(value: string): value is SupportTicketStatus {
  return SUPPORT_TICKET_STATUSES.includes(value as SupportTicketStatus)
}

export function normalizeSupportTicketStatus(
  status: string | null | undefined,
): SupportTicketStatus {
  if (!status) return 'open'
  if (status === 'waiting_response') return 'waiting_customer'
  if (isSupportTicketStatus(status)) return status
  return 'open'
}

export function canStudentCloseTicket(status: string | null | undefined): boolean {
  return STUDENT_CLOSABLE_STATUSES.includes(normalizeSupportTicketStatus(status))
}
