// =====================================================
// STUDENT QUESTIONS - SERVICE (API NestJS: /api/learning/questions)
// =====================================================

import { apiServer } from '@/lib/server-api'
import type {
  QuestionStatusFilter,
  StudentQuestionCourseFilter,
  StudentQuestionsResult,
} from '../types'

/**
 * Perguntas feitas pela pessoa logada, com filtros e paginação. A API sempre filtra pelo usuário
 * da sessão (o `userId` só existe por compatibilidade com quem já chamava esta função).
 */
export async function getStudentQuestions(
  _userId: string,
  filters?: {
    courseId?: string
    search?: string
    status?: QuestionStatusFilter
    page?: number
    pageSize?: number
  },
): Promise<StudentQuestionsResult> {
  const result = await apiServer<StudentQuestionsResult>('/learning/questions', {
    query: {
      course: filters?.courseId && /^\d+$/.test(filters.courseId) ? filters.courseId : undefined,
      search: filters?.search?.trim() ? filters.search.trim().slice(0, 100) : undefined,
      status: filters?.status || 'all',
      page: Number.isFinite(filters?.page) ? Math.max(1, Number(filters?.page)) : 1,
      pageSize: Number.isFinite(filters?.pageSize)
        ? Math.min(50, Math.max(1, Number(filters?.pageSize)))
        : 20,
    },
  })

  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function getStudentQuestionCourses(
  _userId: string,
): Promise<StudentQuestionCourseFilter[]> {
  const result = await apiServer<StudentQuestionCourseFilter[]>('/learning/questions/courses')
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
