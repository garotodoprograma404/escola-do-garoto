import type { ProducerLead, ProducerLeadStatus } from '../services/producerLeadsService'

export type LeadFilterStatus = ProducerLeadStatus | 'all'

export const LEAD_STATUS_OPTIONS: Array<{ value: ProducerLeadStatus; label: string }> = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'archived', label: 'Arquivado' },
]

export function leadStatusLabel(status: ProducerLeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Novo'
}

export function leadStatusBadgeClass(status: ProducerLeadStatus): string {
  switch (status) {
    case 'contacted':
      return 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-200'
    case 'qualified':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
    case 'archived':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'
    default:
      return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200'
  }
}

/** Telefone brasileiro de 10 ou 11 dígitos como `(11) 91234-5678`; outro formato fica como veio. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  return phone
}

/** Link do WhatsApp (Brasil); `null` se o telefone não tem 10 ou 11 dígitos. */
export function toWhatsAppHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11 ? `https://wa.me/55${digits}` : null
}

/** Contagens do topo da fila de leads. */
export function summarizeLeads(leads: ProducerLead[]) {
  const stats = { total: leads.length, newCount: 0, contactedCount: 0, withRecordedContent: 0 }

  for (const lead of leads) {
    if (lead.status === 'new') stats.newCount += 1
    if (lead.status === 'contacted') stats.contactedCount += 1
    if (lead.hasRecordedContent) stats.withRecordedContent += 1
  }

  return stats
}

/** Filtra por situação e por texto (nome, e-mail, telefone, cidade, tema ou mensagem). */
export function filterLeads(
  leads: ProducerLead[],
  searchTerm: string,
  statusFilter: LeadFilterStatus,
): ProducerLead[] {
  const search = searchTerm.trim().toLowerCase()

  return leads.filter((lead) => {
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false
    if (!search) return true

    return [
      lead.fullName,
      lead.email,
      lead.phone,
      lead.city,
      lead.topic || '',
      lead.message || '',
    ].some((field) => field.toLowerCase().includes(search))
  })
}
