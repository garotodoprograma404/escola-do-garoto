import { z } from 'zod'
import { idSchema } from '../../common/pipes/id-param.pipe.js'

/** Id opcional vindo do formulário (texto ou número); vazio/ausente = sem pai. */
const optionalId = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.union([z.null(), idSchema]),
)

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null)

/** Corpo de criação/edição de categoria. */
export const categoryBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug deve ter no mínimo 2 caracteres')
    .max(60, 'Slug deve ter no máximo 60 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: optionalText(500),
  icon: optionalText(50),
  color: optionalText(30),
  parentId: optionalId,
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().min(0, 'Ordem deve ser um número positivo').default(0),
})
export type CategoryBody = z.infer<typeof categoryBodySchema>

export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'active', 'inactive']).default('ALL'),
  featured: z.enum(['true', 'false']).optional(),
})
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>

export const moveCategorySchema = z.object({ direction: z.enum(['up', 'down']) })
export type MoveCategoryBody = z.infer<typeof moveCategorySchema>
