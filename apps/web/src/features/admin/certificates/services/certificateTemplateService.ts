import { apiServer } from '@/lib/server-api'
import type {
  CertificateTemplateOrientation,
  CertificateTemplateStatus,
} from '@/shared/types/certificates-db'

export interface AdminCertificateTemplate {
  id: number
  name: string
  description: string | null
  status: CertificateTemplateStatus
  orientation: CertificateTemplateOrientation
  pageSize: string
  versionCount: number
  latestVersionNumber: number | null
  activeCourseLinks: number
  publishedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Modelos de certificado (só admin: a API confere o papel). */
export async function getAdminCertificateTemplates(): Promise<AdminCertificateTemplate[]> {
  const result = await apiServer<AdminCertificateTemplate[]>('/certificates/templates')

  if (!result.ok) {
    console.error('Error loading certificate templates:', result.error.statusCode)
    throw new Error('Não foi possível carregar os templates de certificado')
  }

  return result.data
}
