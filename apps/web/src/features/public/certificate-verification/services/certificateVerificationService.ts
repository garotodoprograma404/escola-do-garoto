import { apiServer } from '@/lib/server-api'

export type CertificateVerificationStatus =
  'valid' | 'revoked' | 'replaced' | 'invalid' | 'not_found'

export interface VerifiedCertificateData {
  status: CertificateVerificationStatus
  certificateCode: string | null
  studentFullName: string | null
  courseTitle: string | null
  issuedAt: string | null
  revokedAt: string | null
  /** A verificação pública não revela o motivo interno da revogação: vem sempre `null`. */
  revokedReason: string | null
}

interface VerifyCertificateApiResponse {
  status: CertificateVerificationStatus
  certificateCode: string | null
  studentFullName: string | null
  courseTitle: string | null
  issuedAt: string | null
  revokedAt: string | null
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeCertificateCode(rawCode: string | null | undefined): string | null {
  if (!rawCode) return null

  const normalized = rawCode.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

export async function verifyCertificateByCode(
  rawCode: string | null | undefined,
): Promise<VerifiedCertificateData | null> {
  const code = normalizeCertificateCode(rawCode)
  if (!code) {
    return null
  }

  // Rota pública da API. O código vai como segmento da URL, então é codificado.
  const result = await apiServer<VerifyCertificateApiResponse>(
    `/certificates/verify/${encodeURIComponent(code)}`,
  )

  if (!result.ok) {
    // Texto que nem vira rota válida (ex.: com "/") também não corresponde a nenhum certificado.
    if (result.error.statusCode === 404) {
      return {
        status: 'not_found',
        certificateCode: null,
        studentFullName: null,
        courseTitle: null,
        issuedAt: null,
        revokedAt: null,
        revokedReason: null,
      }
    }

    console.error('Error verifying certificate by code:', result.error.statusCode)
    return null
  }

  const row = result.data

  return {
    status: row.status,
    certificateCode: toNullableString(row.certificateCode) || code,
    studentFullName: toNullableString(row.studentFullName),
    courseTitle: toNullableString(row.courseTitle),
    issuedAt: toNullableString(row.issuedAt),
    revokedAt: toNullableString(row.revokedAt),
    revokedReason: null,
  }
}
