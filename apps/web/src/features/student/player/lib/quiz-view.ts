import type { LessonQuizData, LessonQuizLoadStatus, LessonQuizQuestion } from '../types'

export interface QuizQuestionFeedback {
  questionId: number
  isCorrect: boolean | null
  correctOptionIds: number[]
  explanation: string | null
}

export interface QuizResult {
  passed: boolean
  approvalRequired: boolean
  passingScore: number
  scorePercentage: number
  objectiveScoredPoints: number
  objectiveTotalPoints: number
  objectiveCorrectQuestions: number
  objectiveTotalQuestions: number
  questionFeedbacks: QuizQuestionFeedback[]
}

const OBJECTIVE_TYPES: LessonQuizQuestion['type'][] = [
  'multiple_choice',
  'multiple_answer',
  'true_false',
]

export function isObjectiveQuestion(question: LessonQuizQuestion): boolean {
  return OBJECTIVE_TYPES.includes(question.type)
}

/** Pergunta de uma só resposta (o clique troca a escolha); as demais acumulam. */
export function isSingleChoice(question: LessonQuizQuestion): boolean {
  return question.type === 'multiple_choice' || question.type === 'true_false'
}

/** Texto do cartão mostrado quando o quiz não pode ser aberto. */
export function getQuizUnavailableCopy(
  status: Exclude<LessonQuizLoadStatus, 'ready'>,
  detail: string | null,
): { title: string; description: string } {
  if (status === 'access_denied') {
    return {
      title: 'Acesso ao quiz indisponível',
      description: 'Não encontramos uma matrícula válida para este questionário nesta aula.',
    }
  }

  if (status === 'not_configured') {
    return {
      title: 'Quiz ainda não configurado',
      description: 'Este questionário ainda não possui configuração completa para ser iniciado.',
    }
  }

  if (status === 'no_valid_questions') {
    return {
      title: 'Quiz sem questões válidas',
      description:
        'O questionário existe, mas ainda não possui perguntas objetivas prontas para resposta.',
    }
  }

  return {
    title: 'Falha técnica ao carregar o quiz',
    description: detail
      ? `Não foi possível carregar o questionário agora (${detail}). Tente novamente em instantes.`
      : 'Não foi possível carregar o questionário agora. Tente novamente em instantes.',
  }
}

/** Respostas, correções e resultado da última tentativa já finalizada (para reabrir o quiz). */
export function buildPersistedQuizState(quiz: LessonQuizData | null) {
  const attempt = quiz?.latestAttempt ?? null
  if (!quiz || !attempt) {
    return { answers: {}, feedback: {}, result: null } as {
      answers: Record<number, number[]>
      feedback: Record<number, QuizQuestionFeedback>
      result: QuizResult | null
    }
  }

  const answers: Record<number, number[]> = {}
  for (const answer of attempt.answers) {
    answers[answer.questionId] = [...answer.selectedOptionIds]
  }

  const feedback: Record<number, QuizQuestionFeedback> = {}
  for (const item of attempt.feedback) {
    feedback[item.questionId] = {
      questionId: item.questionId,
      isCorrect: item.isCorrect,
      correctOptionIds: [...item.correctOptionIds],
      explanation: item.explanation,
    }
  }

  const result: QuizResult = {
    passed: attempt.passed,
    approvalRequired: quiz.approvalRequired,
    passingScore: quiz.passingScore,
    scorePercentage: attempt.scorePercentage,
    objectiveScoredPoints: attempt.scoredPoints,
    objectiveTotalPoints: attempt.totalPoints,
    objectiveCorrectQuestions: attempt.feedback.filter((item) => item.isCorrect === true).length,
    objectiveTotalQuestions: quiz.questions.length,
    questionFeedbacks: attempt.feedback,
  }

  return { answers, feedback, result }
}

/** Nova lista de opções marcadas depois de um clique em `optionId`. */
export function toggleSelection(
  question: LessonQuizQuestion,
  current: number[],
  optionId: number,
): number[] {
  if (isSingleChoice(question)) return [optionId]
  return current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
}

/** Opções sem repetição e em ordem, no formato que a API espera. */
export function normalizeSelection(optionIds: number[] | undefined): number[] {
  return [...new Set(optionIds ?? [])].sort((a, b) => a - b)
}
