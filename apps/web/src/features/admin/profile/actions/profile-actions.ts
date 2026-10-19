'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(120),
  bio: z.string().trim().max(1200, 'Bio muito longa').optional(),
  phone: z.string().trim().max(40, 'Telefone muito longo').optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

function getFormString(formData: FormData, field: string): string | undefined {
  const value = formData.get(field)
  return typeof value === 'string' ? value : undefined
}

function revalidateAdminProfilePaths() {
  revalidatePath('/admin/profile')
  revalidatePath('/admin')
}

/** A API só mexe no perfil da própria sessão: nenhum id de usuário vai na chamada. */
export async function updateAdminProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    full_name: getFormString(formData, 'full_name'),
    bio: getFormString(formData, 'bio'),
    phone: getFormString(formData, 'phone'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const result = await apiServer<void>('/admin/profile', { method: 'PATCH', body: parsed.data })
  if (!result.ok) {
    return { success: false, error: result.error.message || 'Erro ao atualizar perfil' }
  }

  revalidateAdminProfilePaths()
  return { success: true }
}

/**
 * Troca a senha. A API exige a senha ATUAL (reautenticação) e, ao trocar, encerra as outras
 * sessões abertas da pessoa; esta continua.
 */
export async function updateAdminPassword(formData: FormData) {
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const result = await apiServer<void>('/admin/profile/password', {
    method: 'PUT',
    body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword },
  })
  if (!result.ok) {
    return { success: false, error: result.error.message || 'Erro ao atualizar senha' }
  }

  return { success: true }
}

/** Grava a URL do avatar que o upload acabou de devolver (a API só aceita arquivo da própria pessoa). */
export async function uploadAdminAvatar(formData: FormData) {
  const avatarUrl = getFormString(formData, 'avatar_url')
  if (!avatarUrl) {
    return { success: false, error: 'URL do avatar não fornecida' }
  }

  const result = await apiServer<void>('/admin/profile/avatar', {
    method: 'PUT',
    body: { avatar_url: avatarUrl },
  })
  if (!result.ok) {
    return { success: false, error: result.error.message || 'Erro ao atualizar avatar' }
  }

  revalidateAdminProfilePaths()
  return { success: true }
}
