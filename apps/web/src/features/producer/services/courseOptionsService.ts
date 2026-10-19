import { apiServer } from '@/lib/server-api'

export interface CourseOption {
  id: string
  title: string
}

/** Cursos do produtor logado, para os filtros das telas de avaliações e perguntas. */
export async function getProducerCourseOptions(): Promise<CourseOption[]> {
  const result = await apiServer<CourseOption[]>('/producer/course-options')
  if (!result.ok) {
    console.error('Error fetching producer course options:', result.error.message)
    return []
  }
  return result.data
}
