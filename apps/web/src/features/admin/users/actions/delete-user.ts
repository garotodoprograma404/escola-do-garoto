'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'

/** "Excluir" = desativar: a API suspende a conta, revoga os papéis e encerra as sessões. */
export async function deleteUserAction(userId: string) {
  const result = await apiServer<void>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })

  if (!result.ok) {
    return { error: result.error.message || 'Erro ao excluir usuário' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}
