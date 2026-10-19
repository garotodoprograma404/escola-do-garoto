import type { QuestionType } from './types'

export const QUESTION_TYPES: Array<{
  value: QuestionType
  label: string
  icon: string
  description: string
}> = [
  {
    value: 'multiple_choice',
    label: 'Múltipla Escolha',
    icon: '🔘',
    description: 'Uma resposta correta',
  },
  {
    value: 'multiple_answer',
    label: 'Múltiplas Respostas',
    icon: '☑️',
    description: 'Várias respostas corretas',
  },
  {
    value: 'true_false',
    label: 'Verdadeiro/Falso',
    icon: '✓✗',
    description: 'Apenas V ou F',
  },
]

export const DEFAULT_QUIZ_SETTINGS = {
  passing_score: 0,
  time_limit_minutes: undefined,
  allow_retake: true,
  show_answers_after: true,
  shuffle_questions: false,
  shuffle_options: false,
}

export const DEFAULT_QUESTION_POINTS = 1
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6
