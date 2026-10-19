import { z } from 'zod'
import {
  completeCourseSchema,
  levelSchema,
  moneySchema,
  slugSchema,
  toCents,
} from '../producer-courses/course-input.schemas.js'
import { isAllowedAssetUrl } from '../producer-courses/lesson-url.js'

export const adminCourseIdParamSchema = z.object({
  id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})
export type AdminCourseIdParam = z.infer<typeof adminCourseIdParamSchema>

// ---- Listagem ----------------------------------------------------------------------------------

const ADMIN_LIST_STATUSES = [
  'ALL',
  'draft',
  'pending',
  'pending_review',
  'approved',
  'rejected',
  'archived',
] as const

export const adminCoursesQuerySchema = z.object({
  status: z.enum(ADMIN_LIST_STATUSES).default('ALL'),
  /** Nome da categoria (`ALL` = todas). */
  category: z.string().trim().max(200).default('ALL'),
  producerId: z.uuid().optional(),
  searchTerm: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
})
export type AdminCoursesQuery = z.infer<typeof adminCoursesQuerySchema>

export const roleUsersQuerySchema = z.object({ role: z.enum(['producer', 'student']) })
export type RoleUsersQuery = z.infer<typeof roleUsersQuerySchema>

// ---- Decisões de auditoria ---------------------------------------------------------------------

export const approveBodySchema = z.object({
  feedback: z.string().trim().max(1000, 'O feedback deve ter no máximo 1000 caracteres').optional(),
})
export type ApproveBody = z.infer<typeof approveBodySchema>

export const rejectBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'O motivo deve ter pelo menos 10 caracteres')
    .max(1000, 'O motivo deve ter no máximo 1000 caracteres'),
})
export type RejectBody = z.infer<typeof rejectBodySchema>

export const requestChangesBodySchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(10, 'O feedback deve ter pelo menos 10 caracteres')
    .max(1000, 'O feedback deve ter no máximo 1000 caracteres'),
  changes: z
    .array(z.string().trim().min(1).max(300))
    .min(1, 'Selecione pelo menos uma mudança necessária')
    .max(30, 'Mudanças demais'),
})
export type RequestChangesBody = z.infer<typeof requestChangesBodySchema>

export const moveToDraftBodySchema = z.object({
  reason: z.string().trim().max(1000, 'Motivo deve ter no máximo 1000 caracteres').optional(),
})
export type MoveToDraftBody = z.infer<typeof moveToDraftBodySchema>

export const archiveBodySchema = z.object({
  reason: z.string().trim().max(1000, 'Motivo deve ter no máximo 1000 caracteres').optional(),
})
export type ArchiveBody = z.infer<typeof archiveBodySchema>

// ---- Matrícula manual --------------------------------------------------------------------------

export const enrollStudentBodySchema = z.object({ studentId: z.uuid('Aluno inválido') })
export type EnrollStudentBody = z.infer<typeof enrollStudentBodySchema>

// ---- Criação simples (modal "Novo curso") ------------------------------------------------------

export const createCourseByAdminBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Título deve ter pelo menos 3 caracteres')
      .max(180, 'Título muito longo'),
    slug: slugSchema,
    producerId: z.uuid('Produtor inválido'),
    categoryId: z.number().int().positive('Categoria inválida'),
    level: levelSchema,
    shortDescription: z
      .string()
      .trim()
      .max(5000, 'Resumo deve ter no máximo 5000 caracteres')
      .nullish(),
    description: z
      .string()
      .trim()
      .min(10, 'Descrição deve ter pelo menos 10 caracteres')
      .max(50_000),
    price: moneySchema('Preço'),
    discountPrice: moneySchema('Preço promocional').nullish(),
    publishNow: z.boolean().default(false),
  })
  .refine(
    (data) =>
      typeof data.discountPrice !== 'number' || toCents(data.discountPrice) < toCents(data.price),
    { message: 'Preço promocional deve ser menor que o preço normal', path: ['discountPrice'] },
  )
export type CreateCourseByAdminBody = z.infer<typeof createCourseByAdminBodySchema>

// ---- Edição rápida (modal "Editar curso") ------------------------------------------------------

const optionalAsset = (message: string) =>
  z.union([z.literal(''), z.string().trim().max(2048).refine(isAllowedAssetUrl, message)]).nullish()

export const editCourseBodySchema = z
  .object({
    producerId: z.uuid('Produtor inválido'),
    title: z
      .string()
      .trim()
      .min(3, 'Título deve ter pelo menos 3 caracteres')
      .max(180, 'Título muito longo'),
    slug: slugSchema,
    categoryId: z.number().int().positive('Categoria inválida'),
    level: levelSchema,
    shortDescription: z
      .string()
      .trim()
      .max(5000, 'Resumo deve ter no máximo 5000 caracteres')
      .nullish(),
    description: z
      .string()
      .trim()
      .min(10, 'Descrição deve ter pelo menos 10 caracteres')
      .max(50_000),
    thumbnailUrl: optionalAsset('Thumbnail inválida'),
    coverImageUrl: optionalAsset('Capa inválida'),
    trailerUrl: optionalAsset('Trailer inválido'),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
    price: moneySchema('Preço'),
    discountPrice: moneySchema('Preço promocional').nullish(),
    priceLocked: z.boolean(),
    couponsEnabled: z.boolean(),
    adminNotes: z.string().max(2000, 'Notas devem ter no máximo 2000 caracteres').nullish(),
  })
  .refine((data) => !data.discountPrice || toCents(data.discountPrice) < toCents(data.price), {
    message: 'Preço promocional deve ser menor que o preço normal',
    path: ['discountPrice'],
  })
export type EditCourseBody = z.infer<typeof editCourseBodySchema>

// ---- Assistente completo (admin) ---------------------------------------------------------------

const adminCourseEditorSettingsSchema = z
  .object({
    ownerMode: z.enum(['self', 'producer']),
    producerId: z.uuid('Produtor inválido').nullish(),
    isFeatured: z.boolean().default(false),
    couponsEnabled: z.boolean().default(false),
    priceLockedByAdmin: z.boolean().default(false),
    adminNotes: z.string().max(2000, 'Notas devem ter no máximo 2000 caracteres').nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerMode === 'producer' && !data.producerId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecione um produtor para vincular ao curso',
        path: ['producerId'],
      })
    }
  })
export type AdminCourseEditorSettings = z.infer<typeof adminCourseEditorSettingsSchema>

export const createCompleteCourseBodySchema = z.object({
  courseData: completeCourseSchema,
  settings: adminCourseEditorSettingsSchema,
})
export type CreateCompleteCourseBody = z.infer<typeof createCompleteCourseBodySchema>

export const saveDraftCourseBodySchema = z.object({
  courseData: z.looseObject({}),
  settings: adminCourseEditorSettingsSchema,
})
export type SaveDraftCourseBody = z.infer<typeof saveDraftCourseBodySchema>

export const updateCompleteCourseBodySchema = z.object({
  courseData: completeCourseSchema,
  settings: adminCourseEditorSettingsSchema,
  options: z.object({ skipCurriculumUpdate: z.boolean().optional() }).optional(),
})
export type UpdateCompleteCourseBody = z.infer<typeof updateCompleteCourseBodySchema>
