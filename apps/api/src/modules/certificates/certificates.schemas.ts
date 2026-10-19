import { z } from 'zod'
import { certificateBuilderSchemaStrict } from './builder-schema.js'

/** Id numérico (bigint do banco) vindo da URL. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Identificador inválido').max(Number.MAX_SAFE_INTEGER),
})

const nullableDescription = z
  .string()
  .trim()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null))

const nameField = z
  .string()
  .trim()
  .min(3, 'Nome deve ter no mínimo 3 caracteres')
  .max(120, 'Nome deve ter no máximo 120 caracteres')

const pageSizeField = z
  .string()
  .trim()
  .min(1, 'Formato da página é obrigatório')
  .max(20, 'Formato da página deve ter no máximo 20 caracteres')
  .transform((value) => value.toUpperCase())

const orientationField = z.enum(['landscape', 'portrait'])

export const createTemplateSchema = z.object({
  name: nameField,
  description: nullableDescription,
  orientation: orientationField.default('landscape'),
  pageSize: pageSizeField.default('A4'),
})
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const updateTemplateSchema = z.object({
  name: nameField,
  description: nullableDescription,
  orientation: orientationField,
  pageSize: pageSizeField,
})
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

export const saveVersionSchema = z.object({
  schemaJson: certificateBuilderSchemaStrict,
  htmlSnapshot: z.string().trim().max(250_000, 'Snapshot HTML muito grande').nullish(),
})
export type SaveVersionInput = z.infer<typeof saveVersionSchema>

export const assetTargetSchema = z.object({
  target: z.enum(['imagePath', 'primarySignaturePath', 'secondarySignaturePath']),
})
export type AssetTarget = z.infer<typeof assetTargetSchema>['target']

/** Valores de exemplo que a prévia aceita na query (`?student_name=...`). */
const previewValue = z.string().trim().max(200).optional()
export const previewQuerySchema = z.object({
  student_name: previewValue,
  course_title: previewValue,
  issue_date: previewValue,
  certificate_code: previewValue,
  workload_hours: previewValue,
})
export type PreviewQuery = z.infer<typeof previewQuerySchema>

export const bindCourseTemplateSchema = z.object({
  templateId: z.coerce.number().int().positive('Modelo inválido'),
  /** Se omitido, usa a versão mais recente do modelo. */
  versionId: z.coerce.number().int().positive('Versão inválida').optional(),
})
export type BindCourseTemplateInput = z.infer<typeof bindCourseTemplateSchema>

export const courseIdParamSchema = z.object({
  courseId: z.coerce.number().int().positive('Curso inválido'),
})

export const issueCertificateSchema = z.object({
  enrollmentId: z.coerce.number().int().positive('Matrícula inválida'),
  source: z.string().trim().max(120, 'Origem muito longa').optional(),
})
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>

export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(5, 'Informe o motivo da revogação').max(500, 'Motivo muito longo'),
})
export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>

export const reissueCertificateSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'Observação muito longa')
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null)),
  /** `true`: regenera só o arquivo, mantendo o código (evento `reissued_same_code`). Padrão: novo código. */
  sameCode: z.boolean().optional().default(false),
})
export type ReissueCertificateInput = z.infer<typeof reissueCertificateSchema>

/**
 * Código da URL de verificação. Texto fora do formato oficial NÃO é erro: a verificação responde
 * "não encontrado" sem consultar o banco (quem confere um papel digita errado).
 */
export const verifyCodeParamSchema = z.object({
  code: z.string().max(200),
})
