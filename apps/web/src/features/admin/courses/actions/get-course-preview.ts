'use server'

// =====================================================
// GET COURSE PREVIEW - SERVER ACTION
// =====================================================

import { apiServer } from '@/lib/server-api'
import { parseCourseId } from '@/features/producer/course-create/lib/api-error'

interface CoursePreviewDetail {
  id: number
  title: string
  slug: string
  description: string
  short_description: string | null
  thumbnail_url: string | null
  cover_image_url: string | null
  trailer_url: string | null
  price: number
  discount_price: number | null
  average_rating: number | null
  level: string
  total_duration_minutes: number
  total_lessons: number
  total_students: number
  total_reviews: number
  has_lifetime_access: boolean
  has_certificate: boolean
  status: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  category: {
    id: number
    name: string
    slug: string
  }
  producer: {
    id: string
    name: string
    slug: string | null
    public_profile_enabled: boolean
    avatar: string | null
    bio: string | null
    expertise_areas: string[]
    average_rating: number | null
    total_students: number
    total_courses: number
  }
  modules: Array<{
    id: number
    title: string
    description: string | null
    display_order: number
    is_published: boolean
    lessons: Array<{
      id: number
      title: string
      description: string | null
      type: 'video' | 'text' | 'quiz' | 'file'
      content_url: string | null
      content_text: string | null
      duration_minutes: number | null
      is_free_preview: boolean
      is_published: boolean
      display_order: number
    }>
  }>
  stats: {
    total_students: number
    total_lessons: number
    total_reviews: number
    completion_rate: number
  }
  what_you_will_learn: string[]
  requirements: string[]
  target_audience: string[]
}

/**
 * Curso para a pré-visualização (modo auditoria). A API só entrega para admin (qualquer curso) ou
 * para o produtor dono do curso; para qualquer outro caso, `null`.
 */
export async function getCourseById(courseId: string): Promise<CoursePreviewDetail | null> {
  const id = parseCourseId(courseId)
  if (!id) return null

  const result = await apiServer<CoursePreviewDetail>(`/admin/courses/${id}/preview`)
  if (!result.ok) {
    if (result.error.statusCode !== 404) {
      console.error('Error fetching course preview:', result.error.message)
    }
    return null
  }
  return result.data
}
