'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { userEditSchema, type UserEditFormData } from '../lib/validations'

/**
 * Edita dados, papel e status. A API faz tudo numa transação: troca de papel revoga os antigos
 * (sem apagar histórico), suspensão derruba as sessões e o último admin é protegido.
 */
export async function updateUserAction(userId: string, data: UserEditFormData) {
  const parsed = userEditSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Dados inválidos' }
  }

  // O e-mail não muda por aqui (a API ignora o campo): não precisa ir junto.
  const { email: _email, ...payload } = parsed.data
  const result = await apiServer<void>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: payload,
  })

  if (!result.ok) {
    return { error: result.error.message || 'Erro ao atualizar usuário' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
