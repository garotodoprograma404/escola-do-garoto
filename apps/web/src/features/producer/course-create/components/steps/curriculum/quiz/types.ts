export type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false'

export interface QuizQuestion {
  id: string
  type: QuestionType
  question_text: string
  question_image_url?: string
  question_image_alt?: string
  explanation?: string
  points: number
  order: number
  options: QuizOption[]
}

export interface QuizOption {
  id: string
  option_text: string
  is_correct: boolean
  order: number
}

export interface QuizSettings {
  passing_score: number
  time_limit_minutes?: number
  allow_retake: boolean
  show_answers_after: boolean
  shuffle_questions: boolean
  shuffle_options: boolean
}

export interface QuestionFormData {
  type: QuestionType
  question_text: string
  question_image_url: string
  question_image_alt: string
  explanation: string
  points: number
  options: QuizOption[]
}

export interface QuestionFormErrors {
  question_text?: string
  question_image_url?: string
  question_image_alt?: string
  options?: string
  points?: string
}
