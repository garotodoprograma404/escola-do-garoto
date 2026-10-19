'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportStats } from './SupportStats'
import { TicketFilters } from './TicketFilters'
import { TicketListTable } from './TicketListTable'
import type {
  SupportStats as SupportStatsType,
  Ticket,
  TicketFilters as TicketFiltersType,
} from '../types'

interface SupportManagementContentProps {
  stats: SupportStatsType
  initialTickets: Ticket[]
}

function matchesTicketFilters(ticket: Ticket, filters: TicketFiltersType): boolean {
  const searchTerm = filters.searchTerm.trim().toLowerCase()
  if (searchTerm.length > 0) {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm) ||
      ticket.userName.toLowerCase().includes(searchTerm) ||
      ticket.userEmail.toLowerCase().includes(searchTerm) ||
      ticket.id.toLowerCase().includes(searchTerm)

    if (!matchesSearch) {
      return false
    }
  }

  if (filters.status !== 'ALL' && ticket.status !== filters.status) {
    return false
  }

  if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) {
    return false
  }

  if (filters.category !== 'ALL' && ticket.category !== filters.category) {
    return false
  }

  if (filters.assignedTo === 'UNASSIGNED' && ticket.assignedTo) {
    return false
  }

  if (
    filters.assignedTo !== 'ALL' &&
    filters.assignedTo !== 'UNASSIGNED' &&
    ticket.assignedTo !== filters.assignedTo
  ) {
    return false
  }

  return true
}

export function SupportManagementContent({ stats, initialTickets }: SupportManagementContentProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<TicketFiltersType>({
    searchTerm: '',
    status: 'ALL',
    priority: 'ALL',
    category: 'ALL',
    assignedTo: 'ALL',
  })

  const filteredTickets = useMemo(
    () => initialTickets.filter((ticket) => matchesTicketFilters(ticket, filters)),
    [filters, initialTickets],
  )

  return (
    <div className="space-y-6">
      <SupportStats stats={stats} />

      <TicketFilters filters={filters} onFiltersChange={setFilters} />

      <TicketListTable
        tickets={filteredTickets}
        onView={(ticket) => {
          router.push(`/admin/support/${ticket.id}`)
        }}
      />
    </div>
  )
}
