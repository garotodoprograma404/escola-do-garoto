// =====================================================
// STUDENT COURSES - SERVICE (API NestJS: GET /api/student/courses)
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { StudentCourse, StudentCoursesStats } from '../types'

/**
 * Cursos do aluno logado (matrículas ativas/concluídas) com progresso. A API sempre usa o usuário
 * da sessão: o `userId` fica só por compatibilidade com quem já chamava esta função.
 */
export async function getStudentCourses(_userId?: string): Promise<StudentCourse[]> {
  const result = await apiServer<StudentCourse[]>('/student/courses')

  if (!result.ok) {
    console.error('Error fetching student courses:', result.error.message)
    throw new Error('Failed to fetch courses')
  }

  return result.data
}

/**
 * Get statistics for student courses
 */
export function calculateStudentCoursesStats(courses: StudentCourse[]): StudentCoursesStats {
  const totalCourses = courses.length
  const completedCourses = courses.filter((c) => c.isCompleted).length
  const inProgressCourses = totalCourses - completedCourses

  const totalHoursWatched =
    courses.reduce((sum, course) => sum + course.watchedDurationMinutes, 0) / 60

  const averageProgress =
    totalCourses > 0 ? courses.reduce((sum, c) => sum + c.progressPercentage, 0) / totalCourses : 0

  return {
    totalCourses,
    inProgressCourses,
    completedCourses,
    totalHoursWatched,
    averageProgress: Math.round(averageProgress),
  }
}
