// =====================================================
// QUIZ LESSON - CLIENT COMPONENT
// Estado da tentativa e envio das respostas; as peças visuais ficam em ./quiz.
// =====================================================

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import { submitQuizAction } from '../actions/quiz-actions'
import {
  buildPersistedQuizState,
  getQuizUnavailableCopy,
  isObjectiveQuestion,
  normalizeSelection,
  toggleSelection,
  type QuizQuestionFeedback,
  type QuizResult,
} from '../lib/quiz-view'
import type { LessonQuizLoadResult } from '../types'
import { QuizHeaderCard } from './quiz/QuizHeaderCard'
import { QuizQuestionCard } from './quiz/QuizQuestionCard'
import { QuizResultCard } from './quiz/QuizResultCard'
import { QuizUnavailableCard } from './quiz/QuizUnavailableCard'

interface QuizLessonProps {
  lessonId: number
  lessonTitle: string
  quizState: LessonQuizLoadResult | null
  isCompleted: boolean
  onPassed: () => void
}

function logQuizUiEvent(event: string, payload: Record<string, unknown>): void {
  console.warn(`[quiz][ui] ${event}`, payload)
}

export function QuizLesson({
  lessonId,
  lessonTitle,
  quizState,
  isCompleted,
  onPassed,
}: QuizLessonProps) {
  const { toast } = useToast()
  const lastUnavailableKeyRef = useRef<string | null>(null)
  const quiz = quizState?.status === 'ready' ? quizState.quiz : null

  const questions = useMemo(() => quiz?.questions || [], [quiz])
  const latestAttempt = quiz?.latestAttempt || null
  const persisted = useMemo(() => buildPersistedQuizState(quiz), [quiz])

  const [selectedOptionsByQuestion, setSelectedOptionsByQuestion] = useState<
    Record<number, number[]>
  >(persisted.answers)
  const [feedbackByQuestionId, setFeedbackByQuestionId] = useState<
    Record<number, QuizQuestionFeedback>
  >(persisted.feedback)
  // Perguntas já confirmadas nesta tentativa (com ou sem correção à vista).
  const [confirmedQuestionIds, setConfirmedQuestionIds] = useState<Set<number>>(
    () => new Set(Object.keys(persisted.feedback).map(Number)),
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [finalResult, setFinalResult] = useState<QuizResult | null>(persisted.result)

  useEffect(() => {
    setSelectedOptionsByQuestion(persisted.answers)
    setFeedbackByQuestionId(persisted.feedback)
    setConfirmedQuestionIds(new Set(Object.keys(persisted.feedback).map(Number)))
    setCurrentQuestionIndex(0)
    setFinalResult(persisted.result)
  }, [lessonId, persisted])

  const currentQuestion = questions[currentQuestionIndex] || null
  const answeredCount = confirmedQuestionIds.size
  const allQuestionsAnswered = questions.length > 0 && answeredCount === questions.length
  const hasObjectiveQuestions = questions.some((question) => isObjectiveQuestion(question))
  const currentFeedback = currentQuestion ? feedbackByQuestionId[currentQuestion.id] || null : null
  const isCurrentAnswered = currentQuestion ? confirmedQuestionIds.has(currentQuestion.id) : false
  const unavailableStatus =
    quizState?.status && quizState.status !== 'ready' ? quizState.status : null
  const unavailableDetail = quizState?.detail ?? null

  useEffect(() => {
    if (!unavailableStatus) return

    const key = `${lessonId}:${unavailableStatus}:${unavailableDetail || 'none'}`
    if (lastUnavailableKeyRef.current === key) return
    lastUnavailableKeyRef.current = key

    logQuizUiEvent('quiz_unavailable', {
      lessonId,
      status: unavailableStatus,
      detail: unavailableDetail,
    })
  }, [lessonId, unavailableDetail, unavailableStatus])

  if (unavailableStatus) {
    return <QuizUnavailableCard {...getQuizUnavailableCopy(unavailableStatus, unavailableDetail)} />
  }

  if (!quiz || !currentQuestion) {
    return (
      <QuizUnavailableCard
        {...getQuizUnavailableCopy('no_valid_questions', 'no_supported_questions')}
      />
    )
  }

  const hasCurrentAnswer = (selectedOptionsByQuestion[currentQuestion.id] || []).length > 0

  const toggleOption = (optionId: number) => {
    if (isSubmitting || finalResult || confirmedQuestionIds.has(currentQuestion.id)) {
      return
    }

    setSelectedOptionsByQuestion((previous) => ({
      ...previous,
      [currentQuestion.id]: toggleSelection(
        currentQuestion,
        previous[currentQuestion.id] || [],
        optionId,
      ),
    }))
  }

  const submitCurrentQuestion = async () => {
    if (!hasCurrentAnswer) {
      toast({
        title: 'Resposta obrigatória',
        description: 'Responda a pergunta antes de continuar.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const submitResult = await submitQuizAction({
      lessonId,
      finalize: false,
      answers: [
        {
          questionId: currentQuestion.id,
          selectedOptionIds: normalizeSelection(selectedOptionsByQuestion[currentQuestion.id]),
        },
      ],
    })
    setIsSubmitting(false)

    if (!submitResult.success || !submitResult.data) {
      logQuizUiEvent('submit_question_failed', {
        lessonId,
        questionId: currentQuestion.id,
        stage: 'question',
        errorCode: !submitResult.success ? submitResult.errorCode : 'missing_data',
        errorType: !submitResult.success ? submitResult.errorType : 'technical',
      })

      toast({
        title: 'Erro',
        description: !submitResult.success
          ? submitResult.error
          : 'Não foi possível corrigir a pergunta',
        variant: 'destructive',
      })
      return
    }

    const feedback = submitResult.data.questionFeedbacks.find(
      (questionFeedback) => questionFeedback.questionId === currentQuestion.id,
    )

    setConfirmedQuestionIds((previous) => new Set(previous).add(currentQuestion.id))

    // Na primeira tentativa a correção só vem ao finalizar: aqui a resposta fica registrada.
    if (!feedback) {
      toast({ title: 'Resposta registrada' })
      return
    }

    setFeedbackByQuestionId((previous) => ({ ...previous, [currentQuestion.id]: feedback }))

    if (feedback.isCorrect === true) {
      toast({ title: 'Resposta correta' })
    } else if (feedback.isCorrect === false) {
      toast({ title: 'Resposta incorreta', variant: 'destructive' })
    } else {
      toast({ title: 'Resposta enviada para correção' })
    }
  }

  const goToNextQuestion = () =>
    setCurrentQuestionIndex((previous) => Math.min(previous + 1, questions.length - 1))

  const goToPreviousQuestion = () =>
    setCurrentQuestionIndex((previous) => Math.max(previous - 1, 0))

  const finalizeQuiz = async () => {
    if (!allQuestionsAnswered) {
      toast({
        title: 'Perguntas pendentes',
        description: 'Responda todas as perguntas antes de finalizar.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const submitResult = await submitQuizAction({
      lessonId,
      finalize: true,
      answers: questions.map((question) => ({
        questionId: question.id,
        selectedOptionIds: normalizeSelection(selectedOptionsByQuestion[question.id]),
      })),
    })
    setIsSubmitting(false)

    if (!submitResult.success || !submitResult.data) {
      logQuizUiEvent('finalize_quiz_failed', {
        lessonId,
        stage: 'finalize',
        errorCode: !submitResult.success ? submitResult.errorCode : 'missing_data',
        errorType: !submitResult.success ? submitResult.errorType : 'technical',
      })

      toast({
        title: 'Erro',
        description: !submitResult.success
          ? submitResult.error
          : 'Não foi possível finalizar o quiz',
        variant: 'destructive',
      })
      return
    }

    const result = submitResult.data
    setFinalResult(result)
    setFeedbackByQuestionId(
      Object.fromEntries(
        result.questionFeedbacks.map((feedback) => [feedback.questionId, feedback]),
      ),
    )

    const scoreLog = {
      lessonId,
      scorePercentage: result.scorePercentage,
      passingScore: result.passingScore,
    }

    if (result.passed) {
      logQuizUiEvent('finalize_quiz_passed', scoreLog)

      toast({
        title: result.approvalRequired ? 'Quiz aprovado' : 'Quiz concluído',
        description: result.approvalRequired
          ? `Você alcançou ${result.scorePercentage}%`
          : `Pontuação registrada: ${result.scorePercentage}%`,
      })
      onPassed()
      return
    }

    logQuizUiEvent('finalize_quiz_not_passed', scoreLog)

    toast({
      title: 'Quiz não aprovado',
      description: `Você fez ${result.scorePercentage}% (mínimo ${result.passingScore}%)`,
      variant: 'destructive',
    })
  }

  const resetAttempt = () => {
    setSelectedOptionsByQuestion({})
    setFeedbackByQuestionId({})
    setConfirmedQuestionIds(new Set())
    setCurrentQuestionIndex(0)
    setFinalResult(null)
  }

  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="space-y-4">
      <QuizHeaderCard
        lessonTitle={lessonTitle}
        approvalRequired={quiz.approvalRequired}
        passingScore={quiz.passingScore}
        currentIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        attemptsCount={quiz.attemptsCount}
        isCompleted={isCompleted}
      />

      <QuizQuestionCard
        question={currentQuestion}
        index={currentQuestionIndex}
        selectedOptionIds={selectedOptionsByQuestion[currentQuestion.id] || []}
        feedback={currentFeedback}
        showAnswers={Boolean(
          currentFeedback && quiz.showAnswersAfter && currentFeedback.isCorrect !== null,
        )}
        disabled={isSubmitting || isCurrentAnswered || Boolean(finalResult)}
        onToggleOption={toggleOption}
      />

      {finalResult && (
        <QuizResultCard
          result={finalResult}
          hasObjectiveQuestions={hasObjectiveQuestions}
          allowRetake={quiz.allowRetake}
          showAnswersAfter={quiz.showAnswersAfter}
          hasAttempt={Boolean(latestAttempt)}
        />
      )}

      <div className="flex justify-end gap-2">
        {!finalResult && !isCurrentAnswered && (
          <Button onClick={submitCurrentQuestion} disabled={isSubmitting || !hasCurrentAnswer}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Corrigindo...' : 'Responder pergunta'}
          </Button>
        )}

        {!finalResult && isCurrentAnswered && !isLastQuestion && (
          <Button onClick={goToNextQuestion} disabled={isSubmitting}>
            Próxima pergunta
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {!finalResult && isCurrentAnswered && isLastQuestion && (
          <Button onClick={finalizeQuiz} disabled={isSubmitting || !allQuestionsAnswered}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Finalizando...' : 'Finalizar quiz'}
          </Button>
        )}

        {finalResult && quiz.allowRetake && (
          <Button variant="outline" onClick={resetAttempt} disabled={isSubmitting}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Refazer quiz
          </Button>
        )}

        {finalResult && currentQuestionIndex > 0 && (
          <Button variant="outline" onClick={goToPreviousQuestion} disabled={isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Pergunta anterior
          </Button>
        )}

        {finalResult && !isLastQuestion && (
          <Button variant="outline" onClick={goToNextQuestion} disabled={isSubmitting}>
            Próxima pergunta
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
