import { apiServer } from '@/lib/server-api'
import type {
  CertificateEventType,
  CertificateIssueMode,
  CertificateStatus,
} from '@/shared/types/certificates-db'

export interface AdminIssuedCertificate {
  id: number
  code: string
  enrollmentId: number
  studentId: string
  courseId: number
  status: CertificateStatus
  issueMode: CertificateIssueMode
  issuedAt: string
  revokedAt: string | null
  revokedReason: string | null
  replacedFromId: number | null
  createdAt: string
  studentName: string
  courseTitle: string
}

export interface AdminCertificateEvent {
  id: number
  certificateId: number | null
  enrollmentId: number
  eventType: CertificateEventType
  actorUserId: string | null
  actorName: string | null
  previousStatus: CertificateStatus | null
  newStatus: CertificateStatus | null
  reason: string | null
  payload: unknown
  eventAt: string
}

export interface AdminCertificateOperationsData {
  certificates: AdminIssuedCertificate[]
  events: AdminCertificateEvent[]
}

/** Certificados emitidos + trilha de eventos (só admin: a API confere o papel). */
export async function getAdminCertificateOperationsData(): Promise<AdminCertificateOperationsData> {
  const result = await apiServer<AdminCertificateOperationsData>('/certificates/issued')

  if (!result.ok) {
    console.error(
      'Error loading issued certificates for admin operations:',
      result.error.statusCode,
    )
    throw new Error('Não foi possível carregar os certificados emitidos')
  }

  return result.data
}
