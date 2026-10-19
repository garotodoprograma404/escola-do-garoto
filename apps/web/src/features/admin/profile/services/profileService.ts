import { apiServer } from '@/lib/server-api'
import type { AdminProfile } from '../types'

/**
 * Perfil de quem está logado como admin. A API sempre devolve o perfil DA SESSÃO: o `userId` que as
 * páginas ainda passam é ignorado de propósito (ninguém consulta o perfil de outra pessoa por aqui).
 */
export async function getAdminProfile(_userId?: string): Promise<AdminProfile | null> {
  const result = await apiServer<AdminProfile>('/admin/profile')
  if (!result.ok) {
    console.error('Error fetching admin profile:', result.error.message)
    return null
  }
  return result.data
}
