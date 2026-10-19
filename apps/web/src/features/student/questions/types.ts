// =====================================================
// STUDENT QUESTIONS - TYPES
// =====================================================

export type QuestionStatusFilter = 'all' | 'pending' | 'answered'

export interface StudentQuestion {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  lessonId: string | null
  lessonTitle: string | null
  question: string
  answer: string | null
  isPublic: boolean
  createdAt: string
  answeredAt: string | null
}

export interface StudentQuestionStats {
  total: number
  pending: number
  answered: number
  public: number
}

export interface StudentQuestionsResult {
  questions: StudentQuestion[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats: StudentQuestionStats
}

export interface StudentQuestionCourseFilter {
  id: string
  title: string
  slug: string
}
