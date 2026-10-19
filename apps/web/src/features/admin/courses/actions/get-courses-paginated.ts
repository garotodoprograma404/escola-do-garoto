'use server'

import { getCoursesPaginated } from '../services/courseService'
import type { AdminCourseFilters } from '../types'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function getCoursesPaginatedAction(
  filters: AdminCourseFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  try {
    const result = await getCoursesPaginated(filters, page, pageSize)
    return result
  } catch (error: unknown) {
    console.error('Error in getCoursesPaginatedAction:', error)
    getErrorMessage(error, 'Erro ao buscar cursos paginados')
    return {
      courses: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }
}
