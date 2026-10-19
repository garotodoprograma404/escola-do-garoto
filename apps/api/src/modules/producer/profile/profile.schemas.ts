import { passwordSchema } from '@vox/contracts'
import { z } from 'zod'

/**
 * Endereço que vai virar link ou imagem na página pública: só http(s) (nada de `javascript:` nem
 * `data:`, que rodariam no navegador de quem visita o perfil).
 */
const webUrl = (label: string, { allowOwnFiles = false } = {}) =>
  z
    .string()
    .trim()
    .max(500, `URL ${label} muito longa`)
    .refine(
      (value) => {
        if (value === '') return true
        if (allowOwnFiles && value.startsWith('/api/files/public/') && !value.includes('..')) {
          return true
        }
        try {
          const url = new URL(value)
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: `URL ${label} inválida. Use um endereço começando com https://` },
    )
    .optional()

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(120, 'Nome muito longo'),
  display_name: z.string().trim().max(120, 'Nome de exibição muito longo').optional(),
  bio: z.string().trim().max(1200, 'Biografia muito longa').optional(),
  slug: z.string().trim().max(120, 'Slug muito longo').optional(),
  expertise_areas: z.string().trim().max(500, 'Especialidades muito longas').optional(),
  cover_url: webUrl('da capa', { allowOwnFiles: true }),
  website_url: webUrl('do site'),
  instagram_url: webUrl('do Instagram'),
  youtube_url: webUrl('do YouTube'),
  linkedin_url: webUrl('do LinkedIn'),
  facebook_url: webUrl('do Facebook'),
  public_profile_enabled: z.boolean().default(false),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const updateAvatarSchema = z.object({
  avatar_url: z.string().trim().min(1, 'URL do avatar não fornecida').max(500),
})
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Informe a senha atual' })
      .min(1, 'Informe a senha atual')
      .max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
