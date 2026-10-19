import { apiServer } from '@/lib/server-api'

export interface CourseOption {
  id: string
  title: string
  slug: string
  thumbnailUrl: string | null
  producerName: string
  price: number
  isPublished: boolean
  categoryName: string
}

interface CourseOptionApiRow {
  id: number
  title: string
  slug: string
  thumbnail_url: string | null
  price: number
  is_published: boolean
  category_name: string | null
  producer_name: string | null
}

function mapCourse(course: CourseOptionApiRow): CourseOption {
  return {
    id: String(course.id),
    title: course.title,
    slug: course.slug,
    thumbnailUrl: course.thumbnail_url,
    producerName: course.producer_name || 'Produtor',
    price: Number(course.price),
    isPublished: course.is_published,
    categoryName: course.category_name || 'Sem categoria',
  }
}

/**
 * Busca cursos disponíveis para seleção em vitrines
 * Retorna apenas cursos publicados e aprovados
 */
export async function getAvailableCourses(searchTerm?: string): Promise<CourseOption[]> {
  const result = await apiServer<CourseOptionApiRow[]>('/admin/showcases/courses', {
    query: { search: searchTerm?.trim() || undefined },
  })

  if (!result.ok) {
    console.error('Error fetching available courses:', result.error.message)
    throw new Error('Erro ao buscar cursos disponíveis')
  }

  return result.data.map(mapCourse)
}

/**
 * Busca cursos por IDs específicos
 * Usado para carregar cursos já selecionados
 */
export async function getCoursesByIds(courseIds: string[]): Promise<CourseOption[]> {
  if (!courseIds || courseIds.length === 0) {
    return []
  }

  const result = await apiServer<CourseOptionApiRow[]>('/admin/showcases/courses/by-ids', {
    query: { ids: courseIds.join(',') },
  })

  if (!result.ok) {
    console.error('Error fetching courses by IDs:', result.error.message)
    throw new Error('Erro ao buscar cursos selecionados')
  }

  return result.data.map(mapCourse)
}
