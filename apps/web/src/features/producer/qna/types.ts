// =====================================================
// PRODUCER Q&A - TYPES
// =====================================================

export interface Question {
  id: string
  courseId: string
  courseTitle: string
  lessonId?: string
  lessonTitle?: string
  studentId: string
  studentName: string
  studentAvatar?: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: string
  isPublic: boolean
  upvotes: number
  createdAt: string
  updatedAt: string
}

export interface QuestionStats {
  total: number
  pending: number
  answered: number
  avgResponseTime: number // in hours
}

export interface ProducerQnA {
  stats: QuestionStats
  questions: Question[]
}

export type QuestionFilter = 'all' | 'pending' | 'answered'
