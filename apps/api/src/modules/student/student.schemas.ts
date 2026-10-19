import { nameSchema, passwordSchema } from '@vox/contracts'
import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    // Campo em branco limpa o valor (a pessoa consegue apagar o que preencheu).
    .transform((value) => (value ? value : null))

export const updateProfileSchema = z.object({
  full_name: nameSchema,
  bio: optionalText(1000),
  phone: z
    .string()
    .trim()
    .max(30, 'Telefone longo demais')
    .regex(/^[0-9()+\-.\s]*$/, 'Telefone inválido')
    .nullish()
    .transform((value) => (value ? value : null)),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const updateAvatarSchema = z.object({
  avatar_url: z.string().trim().min(1, 'URL do avatar não fornecida').max(300),
})
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual').max(128),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const notificationPreferencesSchema = z.object({
  email_course_updates: z.boolean(),
  email_new_content: z.boolean(),
  email_promotions: z.boolean(),
  email_weekly_summary: z.boolean(),
  push_course_updates: z.boolean(),
  push_new_content: z.boolean(),
})
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesInput = {
  email_course_updates: true,
  email_new_content: true,
  email_promotions: false,
  email_weekly_summary: true,
  push_course_updates: true,
  push_new_content: true,
}
