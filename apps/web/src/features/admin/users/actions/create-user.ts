'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { userCreateSchema, type UserCreateFormData } from '../lib/validations'

/**
 * Cria o usuário pela API (conta com e-mail já confirmado + perfil + papel). A validação aqui é só
 * para a mensagem chegar rápido; a API valida tudo de novo e confere que quem chama é admin.
 */
export async function createUserAction(data: UserCreateFormData) {
  const parsed = userCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  const { confirmPassword: _confirmPassword, ...payload } = parsed.data
  const result = await apiServer<{ userId: string }>('/admin/users', { body: payload })

  if (!result.ok) {
    return { error: result.error.message || 'Erro ao criar usuário' }
  }

  revalidatePath('/admin/users')
  return { success: true, userId: result.data.userId }
}
