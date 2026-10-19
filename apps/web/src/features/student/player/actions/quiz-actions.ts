// =====================================================
// STUDENT PLAYER - QUIZ ACTIONS
// =====================================================
//
// A correção (nota mínima, tentativas, gabarito, conclusão da aula) é toda da API. O gabarito só
// volta depois de responder, e só quando o produtor ligou "mostrar respostas depois".

'use server'

import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const submitQuizSchema = z.object({
  lessonId: z.number().int().positive(),
  finalize: z.boolean().optional().default(true),
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      selectedOptionIds: z.array(z.number().int().positive()).default([]),
    }),
  ),
})

type SubmitQuizInput = z.input<typeof submitQuizSchema>

type QuizSubmitErrorType = 'access' | 'validation' | 'configuration' | 'technical'

type QuizSubmitErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'LESSON_NOT_FOUND'
  | 'COURSE_RESOLUTION_FAILED'
  | 'ENROLLMENT_NOT_FOUND'
  | 'QUIZ_SETTINGS_QUERY_FAILED'
  | 'QUIZ_SETTINGS_NOT_FOUND'
  | 'ATTEMPT_LOOKUP_FAILED'
  | 'RETAKE_NOT_ALLOWED'
  | 'ANSWERS_REQUIRED'
  | 'QUIZ_QUESTIONS_NOT_FOUND'
  | 'QUIZ_HAS_NO_QUESTIONS'
  | 'QUIZ_UNSUPPORTED_QUESTION_TYPES'
  | 'INVALID_QUESTION_IDS'
  | 'QUIZ_OPTIONS_LOOKUP_FAILED'
  | 'INVALID_OPTION_IDS'
  | 'FINALIZE_WITH_PENDING_ANSWERS'
  | 'ATTEMPT_INSERT_FAILED'
  | 'LESSON_COMPLETION_FAILED'
  | 'INPUT_VALIDATION_FAILED'
  | 'UNKNOWN_ERROR'

interface QuizSubmitFailure {
  success: false
  error: string
  errorCode: QuizSubmitErrorCode
  errorType: QuizSubmitErrorType
}

interface QuizSubmitSuccess {
  success: true
  data: {
    passed: boolean
    approvalRequired: boolean
    passingScore: number
    scorePercentage: number
    objectiveScoredPoints: number
    objectiveTotalPoints: number
    objectiveCorrectQuestions: number
    objectiveTotalQuestions: number
    questionFeedbacks: Array<{
      questionId: number
      isCorrect: boolean | null
      correctOptionIds: number[]
      explanation: string | null
    }>
  }
}

type SubmitQuizResult = QuizSubmitFailure | QuizSubmitSuccess

function errorTypeFromStatus(statusCode: number): QuizSubmitErrorType {
  if (statusCode === 401 || statusCode === 403 || statusCode === 404) return 'access'
  if (statusCode === 400 || statusCode === 409) return 'validation'
  if (statusCode === 422) return 'configuration'
  return 'technical'
}

function buildQuizSubmitFailure(
  error: string,
  errorCode: QuizSubmitErrorCode,
  errorType: QuizSubmitErrorType,
  meta?: Record<string, unknown>,
): QuizSubmitFailure {
  console.warn('[quiz][action][failed]', { errorCode, errorType, ...meta })
  return { success: false, error, errorCode, errorType }
}

export async function submitQuizAction(input: SubmitQuizInput): Promise<SubmitQuizResult> {
  const parsed = submitQuizSchema.safeParse(input)
  if (!parsed.success) {
    return buildQuizSubmitFailure(
      parsed.error.errors[0]?.message || 'Respostas inválidas',
      'INPUT_VALIDATION_FAILED',
      'validation',
      { lessonId: input.lessonId },
    )
  }

  const { lessonId, finalize, answers } = parsed.data
  const result = await apiServer<QuizSubmitSuccess['data']>(
    `/learning/lessons/${lessonId}/quiz/attempts`,
    { method: 'POST', body: { finalize, answers } },
  )

  if (result.ok) return { success: true, data: result.data }

  const { statusCode, message, code } = result.error
  if (statusCode === 401) {
    return buildQuizSubmitFailure('Não autenticado', 'NOT_AUTHENTICATED', 'access', { lessonId })
  }
  return buildQuizSubmitFailure(
    message || 'Erro ao enviar quiz',
    (code as QuizSubmitErrorCode | undefined) ?? 'UNKNOWN_ERROR',
    errorTypeFromStatus(statusCode),
    { lessonId, statusCode },
  )
}
