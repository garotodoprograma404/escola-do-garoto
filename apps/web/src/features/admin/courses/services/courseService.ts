import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'
import type { AdminCourseListItem, AdminCourseFilters, AdminCourseEditorData } from '../types'

/*
 * Chamadas à API de administração de cursos (`/api/admin/courses`). Toda regra (papel de admin,
 * transição de status, auditoria, notificação ao produtor) fica na API: aqui só se pede e se
 * traduz a resposta para o formato que as telas já esperam.
 */

interface PaginatedResult {
  courses: AdminCourseListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CourseStatusCounts {
  draft: number
  pending: number
  approved: number
  rejected: number
  archived: number
}

export interface CourseAudit {
  id: number
  course_id: number
  auditor_id: string
  decision: 'approved' | 'rejected' | 'changes_requested'
  feedback: string | null
  changes_requested: string[] | null
  created_at: string
}

export async function getCoursesPaginated(
  filters: AdminCourseFilters,
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedResult> {
  const empty: PaginatedResult = { courses: [], total: 0, page, pageSize, totalPages: 0 }

  const result = await apiServer<PaginatedResult>('/admin/courses', {
    query: {
      status: filters.status,
      category: filters.category,
      producerId: filters.producerId,
      searchTerm: filters.searchTerm,
      page,
      pageSize,
    },
  })

  if (!result.ok) {
    console.error('Error fetching courses:', result.error.message)
    return empty
  }
  return result.data
}

export async function getCourseStatusCounts(): Promise<CourseStatusCounts> {
  const result = await apiServer<CourseStatusCounts>('/admin/courses/status-counts')
  if (!result.ok) {
    console.error('Error fetching course status counts:', result.error.message)
    return { draft: 0, pending: 0, approved: 0, rejected: 0, archived: 0 }
  }
  return result.data
}

/** Aprova o curso. Quem decide é a sessão: o `auditorId` não é enviado (a API usa o admin logado). */
export async function approveCourse(
  courseId: string,
  _auditorId: string,
  feedback?: string,
): Promise<{ success: boolean; error?: string }> {
  const id = parseCourseId(courseId)
  if (!id) return { success: false, error: 'Curso inválido' }

  const result = await apiServer(`/admin/courses/${id}/approve`, {
    method: 'POST',
    body: { feedback: feedback?.trim() || undefined },
  })
  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao aprovar curso') }
  }
  return { success: true }
}

export async function rejectCourse(
  courseId: string,
  _auditorId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const id = parseCourseId(courseId)
  if (!id) return { success: false, error: 'Curso inválido' }

  const result = await apiServer(`/admin/courses/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao rejeitar curso') }
  }
  return { success: true }
}

export async function requestChanges(
  courseId: string,
  _auditorId: string,
  feedback: string,
  changesRequested: string[],
): Promise<{ success: boolean; error?: string }> {
  const id = parseCourseId(courseId)
  if (!id) return { success: false, error: 'Curso inválido' }

  const result = await apiServer(`/admin/courses/${id}/request-changes`, {
    method: 'POST',
    body: { feedback, changes: changesRequested },
  })
  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao solicitar mudanças') }
  }
  return { success: true }
}

/** Arquiva o curso: ele sai do catálogo, e quem já está matriculado mantém o acesso. */
export async function archiveCourse(
  courseId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const id = parseCourseId(courseId)
  if (!id) return { success: false, error: 'Curso inválido' }

  const result = await apiServer(`/admin/courses/${id}/archive`, {
    method: 'POST',
    body: { reason: reason?.trim() || undefined },
  })
  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao arquivar curso') }
  }
  return { success: true }
}

/** Curso completo + configurações administrativas para o editor do admin. */
export async function getCourseForAdminEdit(
  courseId: string,
): Promise<AdminCourseEditorData | null> {
  const id = parseCourseId(courseId)
  if (!id) return null

  const result = await apiServer<AdminCourseEditorData>(`/admin/courses/${id}/editor`)
  if (!result.ok) {
    console.error('Error fetching admin course editor data:', result.error.message)
    return null
  }
  return result.data
}

export async function getCourseAudits(courseId: string): Promise<CourseAudit[]> {
  const id = parseCourseId(courseId)
  if (!id) return []

  const result = await apiServer<CourseAudit[]>(`/admin/courses/${id}/audits`)
  if (!result.ok) {
    console.error('Error fetching course audits:', result.error.message)
    return []
  }
  return result.data
}
