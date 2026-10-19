'use server'

import { getAvailableCourses, getCoursesByIds } from '../services/courseService'

/**
 * Server Action para buscar cursos disponíveis
 */
export async function searchCoursesAction(searchTerm?: string) {
  try {
    const courses = await getAvailableCourses(searchTerm)
    return { success: true, data: courses }
  } catch (error) {
    console.error('Error searching courses:', error)
    return { success: false, error: 'Erro ao buscar cursos', data: [] }
  }
}

/**
 * Server Action para buscar cursos por IDs
 */
export async function getCoursesByIdsAction(courseIds: string[]) {
  try {
    const courses = await getCoursesByIds(courseIds)
    return { success: true, data: courses }
  } catch (error) {
    console.error('Error fetching courses by IDs:', error)
    return { success: false, error: 'Erro ao buscar cursos', data: [] }
  }
}
