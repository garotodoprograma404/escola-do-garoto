import 'server-only'
import type { AuthResponse, SessionUser } from '@vox/contracts'
import { cache } from 'react'
import { apiServer } from './server-api'

/**
 * Quem está logado (ou `null`).
 * Uma consulta por requisição (o `cache` do React junta chamadas repetidas).
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const result = await apiServer<AuthResponse>('/auth/me')
  return result.ok ? result.data.user : null
})
