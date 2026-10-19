import { apiServer } from '@/lib/server-api'
import { parseCourseId } from '@/features/producer/course-create/lib/api-error'
import type { ProducerCourse, CourseFilters, CourseEditData } from '../types'

/*
 * Leituras dos cursos do produtor. Quem é o produtor vem da SESSÃO (cookie), nunca do argumento:
 * o parâmetro `producerId` ficou só para não quebrar quem já chama.
 */

/**
 * Cursos do produtor logado, com métricas.
 */
export async function getProducerCourses(
  _producerId: string,
  filters?: CourseFilters,
): Promise<ProducerCourse[]> {
  const result = await apiServer<ProducerCourse[]>('/producer/courses', {
    query: {
      search: filters?.search,
      status: filters?.status,
      sortBy: filters?.sortBy,
      sortOrder: filters?.sortOrder,
    },
  })

  if (!result.ok) {
    console.error('Error fetching producer courses:', result.error.message)
    throw new Error('Falha ao buscar cursos')
  }

  return result.data
}

/**
 * Curso completo (módulos, aulas e quiz) no formato do assistente de edição.
 */
export async function getCourseForEdit(
  courseId: string,
  _producerId: string,
): Promise<CourseEditData | null> {
  const id = parseCourseId(courseId)
  if (!id) return null

  const result = await apiServer<CourseEditData>(`/producer/courses/${id}/edit`)
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching course for edit:', result.error.message)
    }
    return null
  }
  return result.data
}
