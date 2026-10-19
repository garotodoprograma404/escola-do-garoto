import { emailSchema, nameSchema, passwordSchema, roleSchema } from '@vox/contracts'
import { z } from 'zod'

/** Status que as telas do admin conhecem (os 3 últimos têm o mesmo efeito: conta suspensa). */
const USER_STATUSES = ['active', 'pending_kyc', 'suspended', 'banned', 'blocked_finance'] as const
export type AdminUserStatus = (typeof USER_STATUSES)[number]

/** Campo opcional de formulário: vazio vira "não informado". */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  )

const optionalDate = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida')
    .optional(),
)

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  status: z.enum(USER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: optionalText(40),
  cpf: optionalText(20),
  birthDate: optionalDate,
  role: roleSchema,
})
export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z
  .object({
    name: nameSchema,
    phone: optionalText(40),
    cpf: optionalText(20),
    birthDate: optionalDate,
    role: roleSchema,
    status: z.enum(USER_STATUSES),
    platformCommissionRate: z.coerce
      .number()
      .min(0, 'Comissão deve estar entre 0% e 100%')
      .max(100, 'Comissão deve estar entre 0% e 100%')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'producer' && data.platformCommissionRate === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Defina o percentual da plataforma para produtores',
        path: ['platformCommissionRate'],
      })
    }
  })
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const userIdParamSchema = z.uuid({ error: 'Usuário inválido' })

/** Dados do próprio admin. */
export const updateAdminProfileSchema = z.object({
  full_name: nameSchema,
  bio: optionalText(1200),
  phone: optionalText(40),
})
export type UpdateAdminProfileInput = z.infer<typeof updateAdminProfileSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Informe a senha atual' }).min(1).max(128),
  newPassword: passwordSchema,
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** O avatar tem que ser um arquivo que a própria pessoa enviou (URL interna do upload de avatar). */
export function ownAvatarUrlSchema(userId: string) {
  const prefix = `/api/files/public/public/avatars/${userId}/`
  return z.object({
    avatar_url: z
      .string({ error: 'URL do avatar não fornecida' })
      .max(300)
      .refine(
        (url) => url.startsWith(prefix) && /^[A-Za-z0-9_.-]+$/.test(url.slice(prefix.length)),
        'Avatar inválido: envie uma imagem pelo upload',
      ),
  })
}
