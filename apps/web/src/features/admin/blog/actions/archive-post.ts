'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'

export async function archivePostAction(postId: string) {
  // A API confere o papel de admin, que o post existe e registra a auditoria.
  const result = await apiServer(`/admin/blog/posts/${encodeURIComponent(postId)}/archive`, {
    method: 'POST',
  })

  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao arquivar post') }
  }

  // Revalidar cache
  revalidatePath('/admin/blog')

  return { success: true }
}
