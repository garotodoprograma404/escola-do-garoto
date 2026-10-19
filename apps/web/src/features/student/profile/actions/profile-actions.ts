'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ApiErrorBody } from '@vox/contracts'
import { apiServer } from '@/lib/server-api'

type ActionResult = { success: boolean; error?: string }

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  bio: z.string().optional(),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

const notificationSchema = z.object({
  email_course_updates: z.boolean(),
  email_new_content: z.boolean(),
  email_promotions: z.boolean(),
  email_weekly_summary: z.boolean(),
  push_course_updates: z.boolean(),
  push_new_content: z.boolean(),
})

/** Mensagem do 1º campo inválido (a API devolve `issues` por campo) ou a mensagem geral. */
function firstIssue(error: ApiErrorBody): string {
  const issue = error.issues ? Object.values(error.issues).flat().find(Boolean) : undefined
  return issue ?? error.message
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get('full_name'),
    bio: formData.get('bio') || undefined,
    phone: formData.get('phone') || undefined,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const result = await apiServer('/student/profile', {
    method: 'PATCH',
    // Campo em branco vira `null` na API (limpa o valor).
    body: {
      full_name: parsed.data.full_name,
      bio: parsed.data.bio ?? null,
      phone: parsed.data.phone ?? null,
    },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    if (result.error.statusCode === 400) return { success: false, error: firstIssue(result.error) }
    console.error('Error updating profile:', result.error.message)
    return { success: false, error: 'Erro ao atualizar perfil' }
  }

  revalidatePath('/student/profile')
  return { success: true }
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  // A API confere a senha atual, grava a nova e encerra as outras sessões da conta.
  const result = await apiServer('/student/profile/password', {
    method: 'POST',
    body: {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    if (result.error.statusCode === 400) return { success: false, error: firstIssue(result.error) }
    if (result.error.statusCode === 429) {
      return { success: false, error: 'Muitas tentativas. Aguarde um minuto e tente de novo.' }
    }
    console.error('Error updating password:', result.error.message)
    return { success: false, error: 'Erro ao atualizar senha' }
  }

  return { success: true }
}

export async function updateNotificationPreferences(formData: FormData): Promise<ActionResult> {
  const parsed = notificationSchema.safeParse({
    email_course_updates: formData.get('email_course_updates') === 'true',
    email_new_content: formData.get('email_new_content') === 'true',
    email_promotions: formData.get('email_promotions') === 'true',
    email_weekly_summary: formData.get('email_weekly_summary') === 'true',
    push_course_updates: formData.get('push_course_updates') === 'true',
    push_new_content: formData.get('push_new_content') === 'true',
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const result = await apiServer('/student/profile/notification-preferences', {
    method: 'PUT',
    body: parsed.data,
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    console.error('Error updating preferences:', result.error.message)
    return { success: false, error: 'Erro ao atualizar preferências' }
  }

  revalidatePath('/student/profile')
  return { success: true }
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const avatarUrl = formData.get('avatar_url')
  if (typeof avatarUrl !== 'string' || !avatarUrl) {
    return { success: false, error: 'URL do avatar não fornecida' }
  }

  // A API só aceita imagem enviada pela própria pessoa pelo upload de arquivos.
  const result = await apiServer('/student/profile/avatar', {
    method: 'PUT',
    body: { avatar_url: avatarUrl },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
    if (result.error.statusCode === 400) return { success: false, error: result.error.message }
    console.error('Error updating avatar:', result.error.message)
    return { success: false, error: 'Erro ao atualizar avatar' }
  }

  revalidatePath('/student/profile')
  return { success: true }
}
