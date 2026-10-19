import { z } from 'zod'
import { isSafeUrl } from '../../common/safe-url.js'

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value)

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Slug na leitura pública: mais frouxo que na criação para nunca esconder post antigo. */
export const slugParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[\w-]+$/)

const tag = z.string().trim().min(1).max(50)

/** Corpo de criação/edição de post. */
export const blogPostBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(200, 'Slug deve ter no máximo 200 caracteres')
    .regex(slugRegex, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  excerpt: z.preprocess(
    emptyToNull,
    z.string().trim().max(300, 'Resumo deve ter no máximo 300 caracteres').nullable(),
  ),
  // O HTML é limpo no servidor antes de gravar; o tamanho mínimo vale para o que o editor mandou.
  content: z.string().min(50, 'Conteúdo deve ter no mínimo 50 caracteres').max(500_000),
  category: z.preprocess(emptyToNull, z.string().trim().max(100).nullable()),
  tags: z.array(tag).max(30).default([]),
  featuredImageUrl: z.preprocess(
    emptyToNull,
    z.string().trim().max(2000).refine(isSafeUrl, 'URL da imagem inválida').nullable(),
  ),
  isFeatured: z.boolean().default(false),
  seoTitle: z.preprocess(
    emptyToNull,
    z.string().trim().max(60, 'Meta título deve ter no máximo 60 caracteres').nullable(),
  ),
  seoDescription: z.preprocess(
    emptyToNull,
    z.string().trim().max(160, 'Meta descrição deve ter no máximo 160 caracteres').nullable(),
  ),
  seoKeywords: z.array(tag).max(30).default([]),
})
export type BlogPostBody = z.infer<typeof blogPostBodySchema>

const BLOG_STATUSES = ['draft', 'published', 'archived'] as const

export const adminListPostsQuerySchema = z.object({
  status: z.enum(BLOG_STATUSES).optional(),
  category: z.string().trim().max(100).optional(),
  authorId: z.uuid().optional(),
  featured: z.enum(['true']).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(10),
})
export type AdminListPostsQuery = z.infer<typeof adminListPostsQuerySchema>

export const publicListPostsQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})
export type PublicListPostsQuery = z.infer<typeof publicListPostsQuerySchema>

export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(3),
})
export type LimitQuery = z.infer<typeof limitQuerySchema>

export const trackViewSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(8)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, 'Sessão inválida'),
})
export type TrackViewBody = z.infer<typeof trackViewSchema>
