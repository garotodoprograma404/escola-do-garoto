import { cache } from 'react'
import { getCurrentUser } from '@/lib/session'
import type { UserRole } from '@/shared/types/roles'

export interface AuthenticatedUserContext {
  userId: string
  email: string
  roles: UserRole[]
  primaryRole: UserRole | null
  profile: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Quem está logado, com papéis e perfil básico (ou `null`). O papel principal é o primeiro ativo,
 * do mais antigo para o mais novo.
 */
const getAuthenticatedUserContextCached = cache(
  async (): Promise<AuthenticatedUserContext | null> => {
    const user = await getCurrentUser()
    if (!user) return null

    return {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      primaryRole: user.roles[0] ?? null,
      profile: { full_name: user.name, avatar_url: user.avatarUrl },
    }
  },
)

export async function getAuthenticatedUserContext(): Promise<AuthenticatedUserContext | null> {
  return getAuthenticatedUserContextCached()
}
