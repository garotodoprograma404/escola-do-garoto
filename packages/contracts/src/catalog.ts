import { z } from 'zod'

export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export const courseLevelSchema = z.enum(COURSE_LEVELS)
export type CourseLevel = z.infer<typeof courseLevelSchema>

export const LESSON_TYPES = ['video', 'text', 'quiz', 'file'] as const
export type LessonType = (typeof LESSON_TYPES)[number]

export const CATALOG_SORTS = ['newest', 'price_asc', 'price_desc'] as const
export const catalogSortSchema = z.enum(CATALOG_SORTS)
export type CatalogSort = z.infer<typeof catalogSortSchema>

export const CATALOG_PAGE_SIZE_DEFAULT = 12
export const CATALOG_PAGE_SIZE_MAX = 50

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido')

/** Filtros do catálogo (query string). Valores inválidos viram 400, nunca são ignorados. */
export const catalogQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    // Vazio vale como "sem busca"; uma letra só é recusada (não dá resultado útil e sai cara).
    .refine((value) => value.length === 0 || value.length >= 2, 'Digite pelo menos 2 letras')
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  category: slugSchema.optional(),
  level: courseLevelSchema.optional(),
  sort: catalogSortSchema.default('newest'),
  // Teto de 200 páginas: offset enorme é caro e ninguém navega tão fundo (use busca e filtros).
  page: z.coerce.number().int().min(1).max(200).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(CATALOG_PAGE_SIZE_MAX)
    .default(CATALOG_PAGE_SIZE_DEFAULT),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
})

export const slugParamSchema = slugSchema

/** Preço já calculado pela API (uma regra só): o front só formata. Valores em centavos de BRL. */
export type Pricing = {
  listPriceCents: number
  finalPriceCents: number
  /** 0 quando não há promoção. */
  discountPercent: number
}

export type CourseCard = {
  id: string
  slug: string
  title: string
  shortDescription: string | null
  thumbnailUrl: string | null
  level: CourseLevel
  category: { name: string; slug: string }
  instructor: { displayName: string; avatarUrl: string | null }
  pricing: Pricing
  lessonsCount: number
  durationMinutes: number
}

/** Aula do currículo público: SEM link nem texto do conteúdo. */
export type PublicLesson = {
  id: string
  title: string
  description: string | null
  type: LessonType
  durationMinutes: number
  isFreePreview: boolean
}

export type PublicModule = {
  id: string
  title: string
  description: string | null
  lessons: PublicLesson[]
}

export type CourseDetail = CourseCard & {
  description: string
  coverImageUrl: string | null
  trailerUrl: string | null
  whatYouWillLearn: string[]
  requirements: string[]
  targetAudience: string[]
  hasLifetimeAccess: boolean
  hasCertificate: boolean
  publishedAt: string
  updatedAt: string
  /** `slug` só existe se o instrutor ligou a página pública dele. */
  instructor: { displayName: string; avatarUrl: string | null; slug: string | null }
  modules: PublicModule[]
}

/** Conteúdo de UMA aula marcada como prévia grátis. */
export type LessonPreview = {
  id: string
  title: string
  type: LessonType
  contentUrl: string | null
  contentText: string | null
}

export type PublicCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  /** Cursos publicados da categoria (e das filhas, no caso de uma raiz). */
  courseCount: number
  children: Array<{ id: string; name: string; slug: string; courseCount: number }>
}

export const SOCIAL_NETWORKS = ['website', 'instagram', 'youtube', 'linkedin', 'facebook'] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

export type InstructorPublicProfile = {
  displayName: string
  slug: string
  headline: string | null
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  expertiseAreas: string[]
  socialLinks: Partial<Record<SocialNetwork, string>>
  courses: CourseCard[]
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
