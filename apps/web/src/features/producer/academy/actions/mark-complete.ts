// =====================================================
// PRODUCER ACADEMY - MARK COMPLETE ACTION
// =====================================================

'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'

/** Marca o conteúdo como concluído para quem está logado (a API usa a sessão e é idempotente). */
export async function markCompleteAction(contentId: string) {
  try {
    const result = await apiServer(`/producer/academy/${encodeURIComponent(contentId)}/complete`, {
      method: 'POST',
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { error: 'Não autenticado' }
      console.error('Error marking academy content as complete:', result.error.message)
      return { error: 'Erro ao marcar como concluído' }
    }

    revalidatePath('/producer/academy')
    return { success: true }
  } catch (error) {
    console.error('Error in markCompleteAction:', error)
    return { error: 'Erro ao marcar como concluído' }
  }
}
