// =====================================================
// STUDENT COURSES - TYPES
// =====================================================

export type CourseStatus = 'all' | 'in_progress' | 'completed'

export interface StudentCourse {
  id: number
  slug: string
  title: string
  thumbnailUrl: string | null
  producerName: string
  producerAvatar: string | null
  categoryName: string
  level: 'beginner' | 'intermediate' | 'advanced'
  totalLessons: number
  totalDurationMinutes: number

  // Enrollment data
  enrollmentId: number
  enrolledAt: string
  lastAccessedAt: string | null
  progressPercentage: number
  completedLessons: number
  completedAt: string | null
  watchedDurationMinutes: number

  // Computed
  isCompleted: boolean
}

export interface StudentCoursesStats {
  totalCourses: number
  inProgressCourses: number
  completedCourses: number
  totalHoursWatched: number
  averageProgress: number
}
