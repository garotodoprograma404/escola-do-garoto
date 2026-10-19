import { apiServer } from '@/lib/server-api'
import type { AdminUserListItem, UserFilters } from '../types'

/**
 * Gestão de usuários do admin. Tudo passa pela API (`/api/admin/users`), que confere o papel de
 * admin a cada chamada: esconder o botão aqui não protege nada, quem protege é o servidor.
 */

export async function getUsers(
  filters: UserFilters,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ users: AdminUserListItem[]; total: number }> {
  const result = await apiServer<{ users: AdminUserListItem[]; total: number }>('/admin/users', {
    query: {
      search: filters.searchTerm.trim() || undefined,
      role: filters.role === 'ALL' ? undefined : filters.role,
      status: filters.status === 'ALL' ? undefined : filters.status,
      page,
      pageSize,
    },
  })

  if (!result.ok) {
    console.error('Error fetching users:', result.error.message)
    return { users: [], total: 0 }
  }
  return result.data
}

export async function getUserById(id: string): Promise<AdminUserListItem | null> {
  const result = await apiServer<AdminUserListItem>(`/admin/users/${encodeURIComponent(id)}`)
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching user:', result.error.message)
    }
    return null
  }
  return result.data
}

/** Usuário + matrículas (modal de detalhes). */
export async function getUserDetailsById(id: string): Promise<AdminUserListItem | null> {
  const result = await apiServer<AdminUserListItem>(
    `/admin/users/${encodeURIComponent(id)}/details`,
  )
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching user details:', result.error.message)
    }
    return null
  }
  return result.data
}

export async function updateUser(id: string, data: unknown): Promise<void> {
  const result = await apiServer<void>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
  })
  if (!result.ok) throw new Error(result.error.message)
}

/** "Excluir" no admin = desativar a conta (a API revoga papéis e encerra as sessões). */
export async function deleteUser(id: string): Promise<void> {
  const result = await apiServer<void>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!result.ok) throw new Error(result.error.message)
}
