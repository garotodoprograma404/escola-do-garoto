'use client'

import { useMemo, useState } from 'react'
import {
  filterTemplates,
  summarizeTemplates,
  type TemplateFilterStatus,
} from '../lib/templateDisplay'
import type { AdminCertificateTemplate } from '../services/certificateTemplateService'
import { CreateTemplateDialog } from './templates/CreateTemplateDialog.client'
import { TemplateDetailsCard } from './templates/TemplateDetailsCard.client'
import { TemplateList } from './templates/TemplateList'
import { TemplateStatsCards } from './templates/TemplateStatsCards'

interface CertificatesManagementProps {
  templates: AdminCertificateTemplate[]
}

export function CertificatesManagement({ templates }: CertificatesManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<TemplateFilterStatus>('all')
  const [pickedTemplateId, setPickedTemplateId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const stats = useMemo(() => summarizeTemplates(templates), [templates])
  const filteredTemplates = useMemo(
    () => filterTemplates(templates, searchTerm, statusFilter),
    [templates, searchTerm, statusFilter],
  )

  // Se o modelo escolhido saiu do filtro (ou nada foi escolhido), vale o primeiro da lista.
  const selectedTemplate =
    filteredTemplates.find((template) => template.id === pickedTemplateId) ??
    filteredTemplates[0] ??
    null

  return (
    <div className="space-y-6">
      <TemplateStatsCards stats={stats} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(400px,0.95fr)]">
        <TemplateList
          templates={filteredTemplates}
          selectedTemplateId={selectedTemplate?.id ?? null}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSelect={setPickedTemplateId}
          onCreate={() => setIsCreateOpen(true)}
        />

        <TemplateDetailsCard template={selectedTemplate} />
      </section>

      <CreateTemplateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
