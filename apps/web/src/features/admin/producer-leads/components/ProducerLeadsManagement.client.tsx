'use client'

import { useMemo, useState } from 'react'
import { filterLeads, summarizeLeads, type LeadFilterStatus } from '../lib/leadsDisplay'
import type { ProducerLead } from '../services/producerLeadsService'
import { LeadDetails } from './leads/LeadDetails.client'
import { LeadList } from './leads/LeadList'
import { LeadStatsCards } from './leads/LeadStatsCards'

interface ProducerLeadsManagementProps {
  leads: ProducerLead[]
}

export function ProducerLeadsManagement({ leads }: ProducerLeadsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadFilterStatus>('all')
  const [pickedLeadId, setPickedLeadId] = useState<number | null>(null)

  const stats = useMemo(() => summarizeLeads(leads), [leads])
  const filteredLeads = useMemo(
    () => filterLeads(leads, searchTerm, statusFilter),
    [leads, searchTerm, statusFilter],
  )

  // Se o lead escolhido saiu do filtro (ou nada foi escolhido), vale o primeiro da fila.
  const selectedLead =
    filteredLeads.find((lead) => lead.id === pickedLeadId) ?? filteredLeads[0] ?? null

  return (
    <div className="space-y-6">
      <LeadStatsCards stats={stats} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.9fr)]">
        <LeadList
          leads={filteredLeads}
          selectedLeadId={selectedLead?.id ?? null}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSelect={setPickedLeadId}
        />

        <LeadDetails lead={selectedLead} />
      </section>
    </div>
  )
}
