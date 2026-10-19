import { apiServer } from '@/lib/server-api'

export type ProducerApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface ProducerApplication {
  id: number
  status: ProducerApplicationStatus
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

/** Candidatura de quem está logado (ou `null` se ainda não enviou). */
export async function getOwnProducerApplication(): Promise<ProducerApplication | null> {
  const result = await apiServer<{ application: ProducerApplication | null }>(
    '/producer-applications/me',
  )

  if (!result.ok) {
    console.error('Error loading producer application:', result.error.message)
    return null
  }

  return result.data.application
}
