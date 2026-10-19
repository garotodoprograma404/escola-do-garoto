import { apiServer } from '@/lib/server-api'

export type ProducerApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface AdminProducerApplication {
  id: number
  userId: string
  fullName: string
  email: string
  phone: string
  expertiseArea: string
  experienceYears: number
  bio: string
  whyProduce: string
  status: ProducerApplicationStatus
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

/** Candidaturas formais de produtor (só admin: a API confere o papel). */
export async function getProducerApplications(): Promise<AdminProducerApplication[]> {
  const result = await apiServer<AdminProducerApplication[]>('/admin/producer-applications')

  if (!result.ok) {
    console.error('Error loading producer applications:', result.error.message)
    throw new Error('Não foi possível carregar as candidaturas de produtores')
  }

  return result.data
}
