import { z } from 'zod'
import { idSchema } from '../../common/pipes/id-param.pipe.js'
import { isSafeUrl } from '../../common/safe-url.js'

const safeUrl = z.string().trim().max(2000).refine(isSafeUrl, 'Informe uma URL válida')

/** Cor CSS simples (#hex, rgb(), hsl() ou nome): nada que possa fechar a declaração de estilo. */
const cssColor = z
  .string()
  .trim()
  .max(40)
  .regex(/^[#a-zA-Z0-9(),.%\s-]+$/, 'Cor inválida')

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value)

const dateTime = z.coerce.date()

// ---------------------------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------------------------

const BANNER_POSITIONS = ['hero', 'mid-page', 'popup'] as const

export const bannerBodySchema = z
  .object({
    title: z.string().trim().min(3, 'O título deve ter ao menos 3 caracteres').max(200),
    subtitle: z.string().trim().min(3, 'O subtítulo deve ter ao menos 3 caracteres').max(500),
    imageUrl: safeUrl.min(1, 'Imagem desktop é obrigatória'),
    mobileImageUrl: z.preprocess(emptyToNull, safeUrl.nullable()),
    linkText: z.string().trim().min(2, 'O texto do botão deve ter ao menos 2 caracteres').max(100),
    linkUrl: safeUrl.min(1, 'Link deve ser uma URL válida'),
    backgroundColor: z.preprocess(emptyToNull, cssColor.nullable()),
    textColor: z.enum(['white', 'black']).default('white'),
    startDate: dateTime,
    endDate: z.preprocess(emptyToNull, dateTime.nullable()),
    isActive: z.boolean(),
    position: z.enum(BANNER_POSITIONS).default('hero'),
  })
  .refine((data) => !data.endDate || data.endDate > data.startDate, {
    message: 'A data de fim deve ser posterior à data de início',
    path: ['endDate'],
  })
export type BannerBody = z.infer<typeof bannerBodySchema>

export const listBannersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  position: z.enum(BANNER_POSITIONS).optional(),
  status: z.enum(['active', 'scheduled', 'expired', 'inactive']).optional(),
})
export type ListBannersQuery = z.infer<typeof listBannersQuerySchema>

export const publicBannersQuerySchema = z.object({
  position: z.enum(BANNER_POSITIONS).default('hero'),
})
export type PublicBannersQuery = z.infer<typeof publicBannersQuerySchema>

export const moveSchema = z.object({ direction: z.enum(['up', 'down']) })
export type MoveBody = z.infer<typeof moveSchema>

export const trackBannerSchema = z.object({ bannerId: idSchema })
export type TrackBannerBody = z.infer<typeof trackBannerSchema>

// ---------------------------------------------------------------------------------------------
// Vitrines (showcases)
// ---------------------------------------------------------------------------------------------

const DYNAMIC_RULES = ['bestsellers', 'newest', 'highest_rated'] as const

export const showcaseBodySchema = z.object({
  title: z.string().trim().min(3, 'O título deve ter ao menos 3 caracteres').max(200),
  description: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
  type: z.enum(['manual', 'dynamic']),
  courseIds: z.array(idSchema).max(50).default([]),
  dynamicRule: z.enum(DYNAMIC_RULES).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  isActive: z.boolean(),
})
export type ShowcaseBody = z.infer<typeof showcaseBodySchema>

export const searchCoursesQuerySchema = z.object({ search: z.string().trim().max(100).optional() })
export type SearchCoursesQuery = z.infer<typeof searchCoursesQuerySchema>

export const coursesByIdsQuerySchema = z.object({
  // `?ids=1,2,3`
  ids: z.preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
    z.array(idSchema).max(50),
  ),
})
export type CoursesByIdsQuery = z.infer<typeof coursesByIdsQuerySchema>
