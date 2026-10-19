'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'

interface ReviewProducerApplicationInput {
  applicationId: number
  decision: 'approved' | 'rejected'
  rejectionReason?: string
}

/**
 * Aprova ou recusa a candidatura. Aprovar concede o papel de produtor e monta o perfil de
 * instrutor (a API faz tudo na mesma transação e registra na auditoria).
 */
export async function reviewProducerApplicationAction(input: ReviewProducerApplicationInput) {
  const result = await apiServer(`/admin/producer-applications/${input.applicationId}/review`, {
    method: 'POST',
    body: { decision: input.decision, rejectionReason: input.rejectionReason || undefined },
  })

  if (!result.ok) {
    if (result.error.statusCode === 409) return { error: 'Esta candidatura já foi analisada' }
    return { error: result.error.message || 'Não foi possível analisar a candidatura' }
  }

  revalidatePath('/admin/producer-leads')
  return { success: true }
}
