import { z } from 'zod'

/**
 * Schema do construtor de modelos (campos posicionados em % da página). É o formato salvo em
 * `certificate_template_versions.schema_json`.
 */

const CERTIFICATE_TOKEN_KEYS = [
  'student_name',
  'course_title',
  'issue_date',
  'certificate_code',
  'workload_hours',
] as const
export type CertificateTokenKey = (typeof CERTIFICATE_TOKEN_KEYS)[number]

export type TemplateOrientation = 'landscape' | 'portrait'

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
  meta: { orientation: TemplateOrientation; pageSize: string }
  background: CertificateBuilderBackground
  elements: CertificateBuilderElement[]
}

/**
 * Onde as imagens do modelo ficam no bucket privado `certificates`
 * (`templates/<id do modelo>/assets/<pasta>/<arquivo>`). Qualquer outro caminho é recusado: assim um
 * admin não consegue apontar o modelo para o PDF de um aluno (`issued/...`) e vê-lo no preview.
 */
const TEMPLATE_ASSET_PATH = /^templates\/\d+\/assets\/[a-z-]+\/[A-Za-z0-9._-]+$/

const storagePathSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return value ?? null
}, z.string().max(500).regex(TEMPLATE_ASSET_PATH, 'Caminho de imagem inválido').nullable())

const elementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['text', 'token']),
  label: z.string().trim().min(1).max(80),
  text: z.string().trim().max(300).nullable(),
  token: z.enum(CERTIFICATE_TOKEN_KEYS).nullable(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(10).max(100),
  fontSize: z.number().min(10).max(120),
  fontWeight: z.number().min(300).max(900),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  align: z.enum(['left', 'center', 'right']),
})

/** Usado ao SALVAR uma versão: rígido, recusa o que não bate com o formato. */
export const certificateBuilderSchemaStrict = z.object({
  version: z.literal(1),
  meta: z.object({
    orientation: z.enum(['landscape', 'portrait']),
    pageSize: z.string().trim().min(1).max(20),
  }),
  background: z.object({
    imagePath: storagePathSchema,
    primarySignaturePath: storagePathSchema,
    secondarySignaturePath: storagePathSchema,
  }),
  elements: z.array(elementSchema).max(80),
})

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function sanitizeStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/^\/+/, '')
  return TEMPLATE_ASSET_PATH.test(trimmed) ? trimmed : null
}

const TOKEN_LABELS: Record<CertificateTokenKey, string> = {
  student_name: 'nome do aluno',
  course_title: 'nome do curso',
  issue_date: 'data de emissao',
  certificate_code: 'codigo do certificado',
  workload_hours: 'carga horaria',
}

function fallbackTokenByLabel(label: string): CertificateTokenKey | null {
  const normalized = label.trim().toLowerCase()
  const found = CERTIFICATE_TOKEN_KEYS.find((key) => TOKEN_LABELS[key] === normalized)
  return found ?? null
}

function sanitizeElement(
  input: Partial<CertificateBuilderElement>,
  index: number,
): CertificateBuilderElement {
  const type = input.type === 'token' ? 'token' : 'text'

  const label =
    typeof input.label === 'string' && input.label.trim().length > 0
      ? input.label.trim().slice(0, 80)
      : type === 'token'
        ? 'Campo dinâmico'
        : 'Texto'

  let token: CertificateTokenKey | null = null
  if (type === 'token') {
    const parsedToken = z.enum(CERTIFICATE_TOKEN_KEYS).safeParse(input.token)
    token = parsedToken.success ? parsedToken.data : fallbackTokenByLabel(label)
  }

  const text =
    type === 'text' && typeof input.text === 'string' && input.text.trim().length > 0
      ? input.text.trim().slice(0, 300)
      : null

  const color =
    typeof input.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(input.color)
      ? input.color
      : '#0F172A'

  return {
    id:
      typeof input.id === 'string' && input.id.trim().length > 0
        ? input.id
        : `el-${Date.now()}-${index}`,
    type,
    label,
    text,
    token,
    x: clampNumber(Number(input.x), 0, 100),
    y: clampNumber(Number(input.y), 0, 100),
    width: clampNumber(Number(input.width), 10, 100),
    fontSize: clampNumber(Number(input.fontSize), 10, 120),
    fontWeight: clampNumber(Number(input.fontWeight), 300, 900),
    color,
    align: input.align === 'center' || input.align === 'right' ? input.align : 'left',
  }
}

export function createDefaultCertificateBuilderSchema(
  orientation: TemplateOrientation,
  pageSize: string,
): CertificateBuilderSchema {
  return {
    version: 1,
    meta: { orientation, pageSize },
    background: { imagePath: null, primarySignaturePath: null, secondarySignaturePath: null },
    elements: [
      {
        id: 'title-1',
        type: 'text',
        label: 'Título',
        text: 'Certificado de Conclusao',
        token: null,
        x: 20,
        y: 16,
        width: 60,
        fontSize: 40,
        fontWeight: 700,
        color: '#0F172A',
        align: 'center',
      },
      {
        id: 'token-student-1',
        type: 'token',
        label: 'Nome do aluno',
        text: null,
        token: 'student_name',
        x: 18,
        y: 42,
        width: 64,
        fontSize: 30,
        fontWeight: 600,
        color: '#111827',
        align: 'center',
      },
      {
        id: 'token-course-1',
        type: 'token',
        label: 'Nome do curso',
        text: null,
        token: 'course_title',
        x: 18,
        y: 56,
        width: 64,
        fontSize: 22,
        fontWeight: 500,
        color: '#1F2937',
        align: 'center',
      },
      {
        id: 'token-code-1',
        type: 'token',
        label: 'Código do certificado',
        text: null,
        token: 'certificate_code',
        x: 18,
        y: 82,
        width: 64,
        fontSize: 14,
        fontWeight: 500,
        color: '#334155',
        align: 'center',
      },
    ],
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Lê o `schema_json` guardado no banco, tolerando dados incompletos (corrige o que dá em vez
 * de falhar).
 */
export function parseCertificateBuilderSchema(
  value: unknown,
  fallbackMeta: { orientation: TemplateOrientation; pageSize: string },
): CertificateBuilderSchema {
  const parsed = certificateBuilderSchemaStrict.safeParse(value)
  if (parsed.success) return parsed.data

  const base = asRecord(value)
  const rawMeta = asRecord(base.meta)
  const rawBackground = asRecord(base.background)
  const elementsRaw: unknown[] = Array.isArray(base.elements) ? base.elements : []

  return {
    version: 1,
    meta: {
      orientation: rawMeta.orientation === 'portrait' ? 'portrait' : fallbackMeta.orientation,
      pageSize:
        typeof rawMeta.pageSize === 'string' && rawMeta.pageSize.trim().length > 0
          ? rawMeta.pageSize.trim()
          : fallbackMeta.pageSize,
    },
    background: {
      imagePath: sanitizeStoragePath(rawBackground.imagePath),
      primarySignaturePath: sanitizeStoragePath(rawBackground.primarySignaturePath),
      secondarySignaturePath: sanitizeStoragePath(rawBackground.secondarySignaturePath),
    },
    elements: elementsRaw.map((element, index) =>
      sanitizeElement(asRecord(element) as Partial<CertificateBuilderElement>, index),
    ),
  }
}
