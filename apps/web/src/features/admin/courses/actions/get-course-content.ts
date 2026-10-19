'use server'

import { apiServer } from '@/lib/server-api'
import { apiErrorMessage, parseCourseId } from '@/features/producer/course-create/lib/api-error'

interface CourseContentModule {
  id: number
  course_id: number
  title: string
  description: string | null
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

interface CourseContentLesson {
  id: number
  module_id: number
  title: string
  description: string | null
  type: 'video' | 'text' | 'quiz' | 'file'
  content_url: string | null
  content_text: string | null
  duration_minutes: number | null
  display_order: number
  is_free_preview: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}

interface CourseContent {
  modules: CourseContentModule[]
  lessons: CourseContentLesson[]
  stats: {
    totalModules: number
    totalLessons: number
    totalDuration: number
    freePreviewCount: number
  }
}

export async function getCourseContentAction(courseId: string) {
  const id = parseCourseId(courseId)
  if (!id) {
    return { success: false, error: 'Curso inválido', data: null }
  }

  const result = await apiServer<CourseContent>(`/admin/courses/${id}/content`)
  if (!result.ok) {
    console.error('Error in getCourseContentAction:', result.error.message)
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Erro ao buscar conteúdo'),
      data: null,
    }
  }

  return { success: true, data: result.data }
}
