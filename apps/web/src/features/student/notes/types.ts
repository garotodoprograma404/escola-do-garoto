// =====================================================
// STUDENT NOTES - TYPES
// =====================================================

export interface LessonNote {
  id: string
  user_id: string
  lesson_id: string
  course_id: string
  title: string
  content: string
  video_timestamp: number | null
  created_at: string
  updated_at: string
  // Joins
  lesson_title?: string
  course_title?: string
  course_slug?: string
}

export type NotesSort = 'recent' | 'oldest'

export interface NotesListResult {
  notes: LessonNote[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface NoteFormData {
  title: string
  content: string
  video_timestamp?: number
}

export interface NotesStatsType {
  total_notes: number
  notes_this_week: number
  courses_with_notes: number
  last_note_date: string | null
}

export type NotesStats = NotesStatsType
