import { z } from 'zod'

export const userEditSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
    cpf: z.string().optional(),
    birthDate: z.string().optional(),
    role: z.enum(['student', 'producer', 'affiliate', 'admin']),
    status: z.enum(['active', 'pending_kyc', 'suspended', 'banned', 'blocked_finance']),
    platformCommissionRate: z.coerce
      .number()
      .min(0, 'Comissão deve estar entre 0% e 100%')
      .max(100, 'Comissão deve estar entre 0% e 100%')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'producer' && data.platformCommissionRate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defina o percentual da plataforma para produtores',
        path: ['platformCommissionRate'],
      })
    }
  })

export const userCreateSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    cpf: z.string().optional(),
    birthDate: z.string().optional(),
    role: z.enum(['student', 'producer', 'affiliate', 'admin']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type UserEditFormData = z.infer<typeof userEditSchema>
export type UserCreateFormData = z.infer<typeof userCreateSchema>
