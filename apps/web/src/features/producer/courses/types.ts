// Course status (must match DB enum `course_status`)
export type CourseStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'

// Producer course with metrics
export interface ProducerCourse {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  price: number
  status: CourseStatus
  created_at: string
  updated_at: string
  published_at: string | null
  // Metrics
  total_students: number
  total_revenue: number
  average_rating: number
  total_reviews: number
  // Recado do admin quando o curso foi rejeitado ou voltou para ajustes
  review_feedback: string | null
}

// Course filters
export interface CourseFilters {
  search?: string
  status?: CourseStatus
  sortBy?: 'created_at' | 'title' | 'students' | 'revenue'
  sortOrder?: 'asc' | 'desc'
}

// Course edit data (complete data from database for editing)
// Reuses CompleteCourseFormData from course-create feature
export type { CompleteCourseFormData as CourseEditData } from '@/features/producer/course-create/types'
