import { apiServer } from '@/lib/server-api'
import type { ProducerProfile } from '../types'

/**
 * Perfil do produtor logado. A API só devolve o da sessão; `userId` fica só por compatibilidade
 * com quem já chama. `null` se não houver perfil ou a pessoa não for produtora.
 */
export async function getProducerProfile(_userId?: string): Promise<ProducerProfile | null> {
  const result = await apiServer<ProducerProfile>('/producer/profile')

  if (!result.ok) {
    if (result.error.statusCode !== 401 && result.error.statusCode !== 403) {
      console.error('Error fetching producer profile:', result.error.message)
    }
    return null
  }

  return result.data
}
