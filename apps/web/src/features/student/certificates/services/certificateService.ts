import { apiServer } from '@/lib/server-api'
import type { CertificateIssueMode, CertificateStatus } from '@/shared/types/certificates-db'

export interface StudentCertificate {
  id: number
  code: string
  status: CertificateStatus
  issueMode: CertificateIssueMode
  issuedAt: string
  issuedAtLabel: string
  issueDateLabel: string | null
  workloadLabel: string | null
  courseTitle: string
  courseSlug: string | null
  /** Rota da API que confere o dono e entrega o PDF (link assinado de poucos segundos). */
  downloadUrl: string | null
}

/**
 * Certificados de quem está logado. O servidor filtra pela sessão: o `userId` recebido aqui não
 * é enviado (ninguém consegue pedir certificados de outra pessoa).
 */
export async function getStudentCertificates(_userId: string): Promise<StudentCertificate[]> {
  const result = await apiServer<StudentCertificate[]>('/certificates/me')

  if (!result.ok) {
    console.error('Error loading student certificates:', result.error.statusCode)
    throw new Error('Não foi possível carregar seus certificados')
  }

  return result.data
}
