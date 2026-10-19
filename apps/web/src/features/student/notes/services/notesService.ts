// =====================================================
// STUDENT NOTES - SERVICE (API NestJS: /api/learning/notes)
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { NotesStatsType, NotesListResult, NotesSort } from '../types'

const EMPTY_STATS: NotesStatsType = {
  total_notes: 0,
  notes_this_week: 0,
  courses_with_notes: 0,
  last_note_date: null,
}

/**
 * Busca as notas da pessoa logada com filtros. A API sempre filtra pelo usuário da sessão
 * (o `userId` só existe por compatibilidade com quem já chamava esta função).
 */
export async function getMyNotes(
  _userId: string,
  filters?: {
    courseId?: string
    search?: string
    sort?: NotesSort
    page?: number
    pageSize?: number
  },
): Promise<NotesListResult> {
  const result = await apiServer<NotesListResult>('/learning/notes', {
    query: {
      // O filtro de curso vem da URL: só números chegam na API.
      course: filters?.courseId && /^\d+$/.test(filters.courseId) ? filters.courseId : undefined,
      search: filters?.search?.trim() ? filters.search.trim().slice(0, 100) : undefined,
      sort: filters?.sort === 'oldest' ? 'oldest' : 'recent',
      page: Number.isFinite(filters?.page) ? Math.max(1, Number(filters?.page)) : 1,
      pageSize: Number.isFinite(filters?.pageSize)
        ? Math.min(50, Math.max(1, Number(filters?.pageSize)))
        : 20,
    },
  })

  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

/**
 * Busca estatísticas das notas do aluno
 */
export async function getNotesStats(_userId: string): Promise<NotesStatsType> {
  const result = await apiServer<NotesStatsType>('/learning/notes/stats')
  return result.ok ? result.data : EMPTY_STATS
}

/**
 * Busca cursos do aluno para filtro
 */
export async function getCoursesForFilter(_userId: string) {
  const result =
    await apiServer<Array<{ id: string; title: string; slug: string }>>('/learning/notes/courses')
  return result.ok ? result.data : []
}
