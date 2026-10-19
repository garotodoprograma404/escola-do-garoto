import { z } from 'zod'

const nullableMoney = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.number().min(0).max(99_999_999).nullable(),
)

const nullableLimit = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.number().int().positive().max(2_000_000_000).nullable(),
)

const dateString = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: 'Data inválida',
  })

/** Formulário de cupom do admin (regras validadas no servidor). */
export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Código deve ter pelo menos 3 caracteres')
      .max(40, 'Código muito longo')
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]+$/, 'Use apenas letras, números, _ e -')),
    type: z.enum(['percentage', 'fixed']),
    value: z
      .number()
      .positive('Valor do desconto deve ser maior que zero')
      .max(99_999_999)
      .refine(
        (value) => Math.round(value * 100) / 100 === value,
        'Use no máximo duas casas decimais',
      ),
    description: z.string().trim().max(255).optional().nullable(),
    usageLimit: nullableLimit,
    minPurchaseAmount: nullableMoney,
    maxDiscountAmount: nullableMoney,
    validFrom: dateString,
    validUntil: z.preprocess(
      (value) => (value === '' ? null : value),
      dateString.nullable().optional(),
    ),
    applicableCourses: z.array(z.coerce.number().int().positive()).max(500).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'percentage' && data.value > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Desconto percentual não pode ser maior que 100%',
      })
    }
    if (data.validUntil && Date.parse(data.validUntil) <= Date.parse(data.validFrom)) {
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'Data final deve ser maior que a data inicial',
      })
    }
  })
export type CouponFormInput = z.infer<typeof couponFormSchema>

export const couponListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'active', 'inactive', 'expired', 'depleted']).default('ALL'),
  type: z.enum(['ALL', 'percentage', 'fixed']).default('ALL'),
})
export type CouponListQuery = z.infer<typeof couponListQuerySchema>

export const couponIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

export const couponCodeQuerySchema = z.object({
  code: z.string().trim().min(1).max(40),
  /** Cupom que está sendo editado: o código dele não conta como "já existe". */
  exceptId: z.coerce.number().int().positive().optional(),
})
