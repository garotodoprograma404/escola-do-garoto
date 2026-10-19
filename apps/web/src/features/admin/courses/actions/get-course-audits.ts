'use server'

import { getCourseAudits } from '../services/courseService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function getCourseAuditsAction(courseId: string) {
  try {
    const audits = await getCourseAudits(courseId)
    return { success: true, data: audits }
  } catch (error: unknown) {
    console.error('Error in getCourseAuditsAction:', error)
    return { success: false, error: getErrorMessage(error, 'Erro ao buscar auditorias'), data: [] }
  }
}
