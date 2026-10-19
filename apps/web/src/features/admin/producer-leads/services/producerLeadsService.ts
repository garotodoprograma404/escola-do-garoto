import { apiServer } from '@/lib/server-api'

export type ProducerLeadStatus = 'new' | 'contacted' | 'qualified' | 'archived'

export interface ProducerLead {
  id: number
  fullName: string
  email: string
  phone: string
  city: string
  hasOnlineExperience: boolean
  hasRecordedContent: boolean
  topic: string | null
  message: string | null
  adminNotes: string | null
  status: ProducerLeadStatus
  source: string
  handledBy: string | null
  contactedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Contatos de produtor (só admin: a API confere o papel). Os 300 mais recentes. */
export async function getProducerLeads(): Promise<ProducerLead[]> {
  const result = await apiServer<ProducerLead[]>('/admin/producer-leads')

  if (!result.ok) {
    console.error('Error loading producer leads:', result.error.message)
    throw new Error('Não foi possível carregar os contatos de produtores')
  }

  return result.data
}
