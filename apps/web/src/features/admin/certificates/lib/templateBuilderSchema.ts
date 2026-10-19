import { z } from 'zod'
import type { CertificateTemplateOrientation } from '@/shared/types/certificates-db'

// Formato do schema do construtor (campos posicionados em % da página). Quem lê/valida de verdade
// ao salvar e quem gera o PDF é a API (`apps/api/src/modules/certificates/builder-schema.ts`);
// aqui ficam os tipos e a checagem de formato para dar erro rápido na tela.

export const CERTIFICATE_TOKEN_OPTIONS = [
  { key: 'student_name', label: 'Nome do aluno' },
  { key: 'course_title', label: 'Nome do curso' },
  { key: 'issue_date', label: 'Data de emissão' },
  { key: 'certificate_code', label: 'Código do certificado' },
  { key: 'workload_hours', label: 'Carga horária' },
] as const

export type CertificateTokenKey = (typeof CERTIFICATE_TOKEN_OPTIONS)[number]['key']

interface CertificateBuilderElement {
  id: string
  type: 'text' | 'token'
  label: string
  text: string | null
  token: CertificateTokenKey | null
  x: number
  y: number
  width: number
  fontSize: number
  fontWeight: number
  color: string
  align: 'left' | 'center' | 'right'
}

interface CertificateBuilderBackground {
  imagePath: string | null
  primarySignaturePath: string | null
  secondarySignaturePath: string | null
}

export interface CertificateBuilderSchema {
  version: 1
  meta: {
    orientation: CertificateTemplateOrientation
    pageSize: string
  }
  background: CertificateBuilderBackground
  elements: CertificateBuilderElement[]
}

const tokenKeySchema = z.enum([
  'student_name',
  'course_title',
  'issue_date',
  'certificate_code',
  'workload_hours',
])

const certificateBuilderElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'token']),
  label: z.string().trim().min(1).max(80),
  text: z.string().trim().max(300).nullable(),
  token: tokenKeySchema.nullable(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(10).max(100),
  fontSize: z.number().min(10).max(120),
  fontWeight: z.number().min(300).max(900),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  align: z.enum(['left', 'center', 'right']),
})

const nullableStoragePathSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  return value ?? null
}, z.string().max(500).nullable())

export const certificateBuilderSchemaStrict = z.object({
  version: z.literal(1),
  meta: z.object({
    orientation: z.enum(['landscape', 'portrait']),
    pageSize: z.string().trim().min(1).max(20),
  }),
  background: z.object({
    imagePath: nullableStoragePathSchema,
    primarySignaturePath: nullableStoragePathSchema,
    secondarySignaturePath: nullableStoragePathSchema,
  }),
  elements: z.array(certificateBuilderElementSchema).max(80),
})

export function getTokenLabel(token: CertificateTokenKey): string {
  return CERTIFICATE_TOKEN_OPTIONS.find((item) => item.key === token)?.label || token
}
