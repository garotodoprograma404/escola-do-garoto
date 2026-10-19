import type { CertificateTemplateStatus } from '@/shared/types/certificates-db'
import type { AdminCertificateTemplate } from '../services/certificateTemplateService'

export type TemplateFilterStatus = CertificateTemplateStatus | 'all'

export const TEMPLATE_STATUS_OPTIONS: Array<{ value: CertificateTemplateStatus; label: string }> = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Arquivado' },
]

export const PAGE_SIZE_OPTIONS = ['A4', 'LETTER', 'A3']

export function statusLabel(status: CertificateTemplateStatus): string {
  return TEMPLATE_STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Rascunho'
}

export function statusBadgeClass(status: CertificateTemplateStatus): string {
  switch (status) {
    case 'published':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
    case 'archived':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300'
    default:
      return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200'
  }
}

/** Contagens do topo da tela de modelos. */
export function summarizeTemplates(templates: AdminCertificateTemplate[]) {
  const stats = { total: templates.length, draftCount: 0, publishedCount: 0, activeBindings: 0 }

  for (const template of templates) {
    if (template.status === 'draft') stats.draftCount += 1
    if (template.status === 'published') stats.publishedCount += 1
    stats.activeBindings += template.activeCourseLinks
  }

  return stats
}

/** Filtra por situação e por texto (nome, descrição ou formato da página). */
export function filterTemplates(
  templates: AdminCertificateTemplate[],
  searchTerm: string,
  statusFilter: TemplateFilterStatus,
): AdminCertificateTemplate[] {
  const normalizedSearch = searchTerm.trim().toLowerCase()

  return templates.filter((template) => {
    if (statusFilter !== 'all' && template.status !== statusFilter) return false
    if (!normalizedSearch) return true

    return [template.name, template.description || '', template.pageSize].some((field) =>
      field.toLowerCase().includes(normalizedSearch),
    )
  })
}
