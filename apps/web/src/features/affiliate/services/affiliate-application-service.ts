import { apiServer } from '@/lib/server-api'

type AffiliateApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

/**
 * Candidatura como a pessoa a vê (snake_case, o formato que o front consome).
 * Sem `notes`, `metadata` e `reviewed_by`: são do time interno e a API não devolve.
 */
interface AffiliateApplication {
  id: number
  user_id: string
  full_name: string
  email: string
  phone: string
  instagram_handle: string | null
  youtube_channel: string | null
  website_url: string | null
  audience_size: string | null
  audience_summary: string
  promotion_channels: string[]
  experience_summary: string
  why_affiliate: string
  status: AffiliateApplicationStatus
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface AffiliateApplicationLandingData {
  application: AffiliateApplication | null
  profile: {
    fullName: string | null
    phone: string | null
  } | null
}

/** Candidatura e dados básicos de perfil de quem está logado (a API sempre usa a sessão). */
export async function getAffiliateApplicationLandingData(): Promise<AffiliateApplicationLandingData> {
  const result = await apiServer<AffiliateApplicationLandingData>('/affiliate/application')
  if (!result.ok) {
    throw new Error(`Erro ao carregar candidatura de afiliado: ${result.error.message}`)
  }
  return result.data
}
