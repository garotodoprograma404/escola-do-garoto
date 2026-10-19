// Form data types
export interface ModuleFormData {
  title: string
  description: string
}

export interface LessonFormData {
  title: string
  description: string
  type: 'video' | 'text' | 'quiz' | 'file'
  duration_minutes: string
  is_preview: boolean
  content_url: string
  content_text: string
  quiz_questions?: Array<{
    id: string
    type: 'multiple_choice' | 'multiple_answer' | 'true_false'
    question_text: string
    question_image_url?: string
    question_image_alt?: string
    explanation?: string
    points: number
    order: number
    options: Array<{
      id: string
      option_text: string
      is_correct: boolean
      order: number
    }>
  }>
  quiz_settings?: {
    passing_score: number
    time_limit_minutes?: number
    allow_retake: boolean
    show_answers_after: boolean
    shuffle_questions: boolean
    shuffle_options: boolean
  }
}

// Drag handle props
export interface DragHandleProps {
  [key: string]: unknown
}
