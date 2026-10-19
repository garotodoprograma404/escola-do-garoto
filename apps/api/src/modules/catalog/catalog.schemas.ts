import { z } from 'zod'

/** Termo de busca: sem espaços nas pontas, no máximo 100 caracteres (corta consulta gigante). */
const searchTerm = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length === 0 ? undefined : value))

const positiveInt = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** Dinheiro vindo de filtro (em reais). Só para filtrar: nunca é usado para cobrar nada. */
const priceFilter = z.coerce.number().min(0).max(1_000_000)

export const catalogQuerySchema = z.object({
  search: searchTerm.optional(),
  category: z.string().trim().min(1).max(120).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  minPrice: priceFilter.optional(),
  maxPrice: priceFilter.optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(['newest', 'popular', 'price_low', 'price_high', 'rating']).default('newest'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const slugParamSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, 'Slug inválido')

export const idParamSchema = positiveInt

const limitQuerySchema = (max: number, fallback: number) =>
  z.object({ limit: z.coerce.number().int().min(1).max(max).default(fallback) })

export const reviewsQuerySchema = limitQuerySchema(50, 10)
export const relatedQuerySchema = limitQuerySchema(12, 4)
export const homeFeaturedQuerySchema = limitQuerySchema(24, 8)
export const homeCategoriesQuerySchema = limitQuerySchema(24, 6)

const searchTypeSchema = z.enum(['course', 'producer', 'blog_post'])
export type SearchType = z.infer<typeof searchTypeSchema>

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  /** Lista separada por vírgula: `course,producer`. Valor desconhecido é ignorado, como no front. */
  type: z
    .string()
    .max(100)
    .optional()
    .transform((raw) => {
      if (!raw) return undefined
      const parsed = raw
        .split(',')
        .map((item) => searchTypeSchema.safeParse(item.trim()))
        .flatMap((result) => (result.success ? [result.data] : []))
      return parsed.length > 0 ? parsed : undefined
    }),
  category: positiveInt.optional(),
  minPrice: priceFilter.optional(),
  maxPrice: priceFilter.optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
})
export type SearchQuery = z.infer<typeof searchQuerySchema>

export const statsQuerySchema = z.object({ q: z.string().trim().max(100).default('') })

export const historyQuerySchema = limitQuerySchema(50, 10)

export const saveHistorySchema = z.object({
  query: z.string().trim().min(2).max(100),
})
export type SaveHistoryInput = z.infer<typeof saveHistorySchema>

/** Ids do carrinho: `?ids=1,2,3` (no máximo 50, sem repetição). */
export const cartItemsQuerySchema = z.object({
  ids: z
    .string()
    .max(600)
    .transform((raw) =>
      [
        ...new Set(
          raw
            .split(',')
            .map((item) => Number(item.trim()))
            .filter((value) => Number.isSafeInteger(value) && value > 0),
        ),
      ].slice(0, 50),
    ),
})
