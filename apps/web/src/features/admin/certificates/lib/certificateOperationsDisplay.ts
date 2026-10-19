import type {
  AdminCertificateEvent,
  AdminIssuedCertificate,
} from '../services/certificateOperationsService'

export type CertificateFilterStatus = AdminIssuedCertificate['status'] | 'all'

export const FILTER_STATUS_OPTIONS: Array<{ value: CertificateFilterStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'revoked', label: 'Revogados' },
  { value: 'replaced', label: 'Substituídos' },
  { value: 'issue_failed', label: 'Falha de emissão' },
]

export function toStatusLabel(status: AdminIssuedCertificate['status']): string {
  if (status === 'active') return 'Ativo'
  if (status === 'revoked') return 'Revogado'
  if (status === 'replaced') return 'Substituído'
  return 'Falha de emissão'
}

export function toStatusBadgeClass(status: AdminIssuedCertificate['status']): string {
  if (status === 'active') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
  }

  if (status === 'revoked') {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
  }

  if (status === 'replaced') {
    return 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-200'
  }

  return 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'
}

export function toIssueModeLabel(mode: AdminIssuedCertificate['issueMode']): string {
  if (mode === 'automatic') return 'Automática'
  if (mode === 'manual') return 'Manual'
  return 'Reemissão'
}

export function toEventLabel(eventType: AdminCertificateEvent['eventType']): string {
  switch (eventType) {
    case 'issued_automatic':
      return 'Emissão automática'
    case 'issued_manual':
      return 'Emissão manual'
    case 'issue_failed':
      return 'Falha de emissão'
    case 'reissued_same_code':
      return 'Reemissão (mesmo código)'
    case 'reissued_new_code':
      return 'Reemissão (novo código)'
    case 'revoked':
      return 'Revogação'
    default:
      return eventType
  }
}

/** Contagens do topo da tela de operação de certificados. */
export function summarizeCertificates(certificates: AdminIssuedCertificate[]) {
  const stats = { total: certificates.length, active: 0, revoked: 0, replaced: 0, failed: 0 }

  for (const certificate of certificates) {
    if (certificate.status === 'active') stats.active += 1
    if (certificate.status === 'revoked') stats.revoked += 1
    if (certificate.status === 'replaced') stats.replaced += 1
    if (certificate.status === 'issue_failed') stats.failed += 1
  }

  return stats
}

/** Filtra por situação e por texto (código, aluno, curso, situação ou modo). */
export function filterCertificates(
  certificates: AdminIssuedCertificate[],
  searchTerm: string,
  statusFilter: CertificateFilterStatus,
): AdminIssuedCertificate[] {
  const search = searchTerm.trim().toLowerCase()

  return certificates.filter((certificate) => {
    if (statusFilter !== 'all' && certificate.status !== statusFilter) return false
    if (!search) return true

    return [
      certificate.code,
      certificate.studentName,
      certificate.courseTitle,
      certificate.status,
      certificate.issueMode,
    ].some((field) => field.toLowerCase().includes(search))
  })
}

/** Últimos eventos de uma matrícula (25), do mais novo para o mais antigo. */
export function eventsForEnrollment(
  events: AdminCertificateEvent[],
  enrollmentId: number,
): AdminCertificateEvent[] {
  return events
    .filter((event) => event.enrollmentId === enrollmentId)
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime())
    .slice(0, 25)
}
