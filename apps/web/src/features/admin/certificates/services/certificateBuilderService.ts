import { apiServer } from '@/lib/server-api'
import type { CertificateTemplateStatus } from '@/shared/types/certificates-db'
import type { CertificateBuilderSchema } from '../lib/templateBuilderSchema'

interface CertificateBuilderBackgroundPreviewUrls {
  imageUrl: string | null
  primarySignatureUrl: string | null
  secondarySignatureUrl: string | null
}

export interface CertificateTemplateBuilderData {
  templateId: number
  name: string
  description: string | null
  status: CertificateTemplateStatus
  orientation: 'landscape' | 'portrait'
  pageSize: string
  latestVersionId: number | null
  latestVersionNumber: number
  latestVersionUpdatedAt: string | null
  schema: CertificateBuilderSchema
  backgroundPreviewUrls: CertificateBuilderBackgroundPreviewUrls
}

/** Dados da tela do construtor. `null` se o modelo não existe. Só admin (a API confere o papel). */
export async function getAdminCertificateTemplateBuilderData(
  templateId: number,
): Promise<CertificateTemplateBuilderData | null> {
  const result = await apiServer<CertificateTemplateBuilderData>(
    `/certificates/templates/${templateId}/builder`,
  )

  if (!result.ok) {
    if (result.error.statusCode === 404) {
      return null
    }

    console.error('Error loading certificate template for builder:', result.error.statusCode)
    throw new Error('Não foi possível carregar o template solicitado')
  }

  return result.data
}
