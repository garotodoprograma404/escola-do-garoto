'use server'

import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/course-create/lib/api-error'

type SupportedRole = 'producer' | 'student'

export interface CourseRoleUserOption {
  id: string
  name: string
  email: string
}

/** Produtores (ou alunos) para os seletores do admin. Só admin consegue (a API confere). */
export async function getRoleUsersAction(role: SupportedRole) {
  const result = await apiServer<CourseRoleUserOption[]>('/admin/courses/role-users', {
    query: { role },
  })

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Erro ao buscar usuários'),
      data: [] as CourseRoleUserOption[],
    }
  }

  return { success: true, data: result.data }
}
