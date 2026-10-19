export type GradableQuestion = {
  id: number
  points: number
  explanation: string | null
}

export type QuestionFeedback = {
  questionId: number
  isCorrect: boolean | null
  correctOptionIds: number[]
  explanation: string | null
}

export type GradeResult = {
  totalPoints: number
  scoredPoints: number
  totalQuestions: number
  correctQuestions: number
  scorePercentage: number
  feedbacks: QuestionFeedback[]
}

/**
 * Corrige o quiz: a questão só vale ponto se o conjunto de alternativas marcadas
 * for EXATAMENTE o conjunto das corretas (serve para múltipla escolha, múltiplas respostas e
 * verdadeiro/falso). Nota = pontos obtidos ÷ pontos totais, arredondada.
 */
export function gradeQuiz(input: {
  questions: GradableQuestion[]
  correctOptionIdsByQuestion: ReadonlyMap<number, readonly number[]>
  selectedOptionIdsByQuestion: ReadonlyMap<number, readonly number[]>
}): GradeResult {
  let totalPoints = 0
  let scoredPoints = 0
  let correctQuestions = 0
  const feedbacks: QuestionFeedback[] = []

  for (const question of input.questions) {
    totalPoints += question.points

    const correctIds = [...(input.correctOptionIdsByQuestion.get(question.id) ?? [])].sort(
      (a, b) => a - b,
    )
    const selectedIds = [...new Set(input.selectedOptionIdsByQuestion.get(question.id) ?? [])].sort(
      (a, b) => a - b,
    )

    const isCorrect =
      selectedIds.length === correctIds.length &&
      selectedIds.every((id, index) => id === correctIds[index])

    if (isCorrect) {
      correctQuestions += 1
      scoredPoints += question.points
    }

    feedbacks.push({
      questionId: question.id,
      isCorrect,
      correctOptionIds: correctIds,
      explanation: question.explanation,
    })
  }

  return {
    totalPoints,
    scoredPoints,
    totalQuestions: input.questions.length,
    correctQuestions,
    scorePercentage: totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0,
    feedbacks,
  }
}

/**
 * Aprovação: nota mínima de `quiz_settings.passing_score`. Com nota mínima 0 o quiz não exige
 * aprovação (basta ter pontos a ganhar).
 */
export function isApproved(input: {
  totalPoints: number
  scorePercentage: number
  passingScore: number
}): boolean {
  const approvalRequired = input.passingScore > 0
  return input.totalPoints > 0 && (!approvalRequired || input.scorePercentage >= input.passingScore)
}

/**
 * O gabarito só volta ao aluno quando o produtor ligou "mostrar respostas depois"
 * (`show_answers_after`). Sem isso, devolve só se acertou/errou.
 */
export function redactFeedback(
  feedbacks: readonly QuestionFeedback[],
  showAnswersAfter: boolean,
): QuestionFeedback[] {
  if (showAnswersAfter) return feedbacks.map((feedback) => ({ ...feedback }))
  return feedbacks.map((feedback) => ({ ...feedback, correctOptionIds: [], explanation: null }))
}
