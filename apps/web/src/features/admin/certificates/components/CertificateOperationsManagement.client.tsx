'use client'

import { useMemo, useState } from 'react'
import {
  eventsForEnrollment,
  filterCertificates,
  summarizeCertificates,
  type CertificateFilterStatus,
} from '../lib/certificateOperationsDisplay'
import type {
  AdminCertificateEvent,
  AdminIssuedCertificate,
} from '../services/certificateOperationsService'
import { CertificateOperationsDetails } from './operations/CertificateOperationsDetails.client'
import { IssuedCertificateList } from './operations/IssuedCertificateList'
import { OperationsStatsCards } from './operations/OperationsStatsCards'

interface CertificateOperationsManagementProps {
  certificates: AdminIssuedCertificate[]
  events: AdminCertificateEvent[]
}

export function CertificateOperationsManagement({
  certificates,
  events,
}: CertificateOperationsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<CertificateFilterStatus>('all')
  const [pickedCertificateId, setPickedCertificateId] = useState<number | null>(null)

  const stats = useMemo(() => summarizeCertificates(certificates), [certificates])
  const filteredCertificates = useMemo(
    () => filterCertificates(certificates, searchTerm, statusFilter),
    [certificates, searchTerm, statusFilter],
  )

  // Se o certificado escolhido saiu do filtro (ou nada foi escolhido), vale o primeiro da lista.
  const selectedCertificate =
    filteredCertificates.find((certificate) => certificate.id === pickedCertificateId) ??
    filteredCertificates[0] ??
    null

  const selectedEvents = useMemo(
    () =>
      selectedCertificate ? eventsForEnrollment(events, selectedCertificate.enrollmentId) : [],
    [events, selectedCertificate],
  )

  return (
    <div className="space-y-6">
      <OperationsStatsCards stats={stats} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,1fr)]">
        <IssuedCertificateList
          certificates={filteredCertificates}
          selectedCertificateId={selectedCertificate?.id ?? null}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onSelect={setPickedCertificateId}
        />

        <CertificateOperationsDetails certificate={selectedCertificate} events={selectedEvents} />
      </section>
    </div>
  )
}
