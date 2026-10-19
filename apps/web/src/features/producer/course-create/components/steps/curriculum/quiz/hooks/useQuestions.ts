import { useCallback, useEffect, useState } from 'react'
import type { QuizQuestion, QuestionFormData } from '../types'
import { DEFAULT_QUESTION_POINTS } from '../constants'

function normalizeQuestions(source: QuizQuestion[]): QuizQuestion[] {
  return source.map((question, questionIndex) => ({
    ...question,
    order: questionIndex,
    options: question.options.map((option, optionIndex) => ({
      ...option,
      order: optionIndex,
    })),
  }))
}

function areQuestionsEqual(a: QuizQuestion[], b: QuizQuestion[]): boolean {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length; i += 1) {
    const qA = a[i]
    const qB = b[i]
    if (
      qA.id !== qB.id ||
      qA.type !== qB.type ||
      qA.question_text !== qB.question_text ||
      qA.question_image_url !== qB.question_image_url ||
      qA.question_image_alt !== qB.question_image_alt ||
      qA.explanation !== qB.explanation ||
      qA.points !== qB.points ||
      qA.order !== qB.order ||
      qA.options.length !== qB.options.length
    ) {
      return false
    }

    for (let j = 0; j < qA.options.length; j += 1) {
      const oA = qA.options[j]
      const oB = qB.options[j]
      if (
        oA.id !== oB.id ||
        oA.option_text !== oB.option_text ||
        oA.is_correct !== oB.is_correct ||
        oA.order !== oB.order
      ) {
        return false
      }
    }
  }

  return true
}

export function useQuestions(initialQuestions: QuizQuestion[] = []) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    normalizeQuestions(initialQuestions),
  )

  useEffect(() => {
    const normalizedQuestions = normalizeQuestions(initialQuestions)
    setQuestions((prev) =>
      areQuestionsEqual(prev, normalizedQuestions) ? prev : normalizedQuestions,
    )
  }, [initialQuestions])

  const addQuestion = useCallback((data: QuestionFormData): void => {
    setQuestions((prev) => {
      const newQuestion: QuizQuestion = {
        id: `question-${crypto.randomUUID()}`,
        type: data.type,
        question_text: data.question_text,
        question_image_url: data.question_image_url || undefined,
        question_image_alt: data.question_image_alt || undefined,
        explanation: data.explanation || undefined,
        points: data.points || DEFAULT_QUESTION_POINTS,
        order: prev.length,
        options: data.options.map((opt, idx) => ({
          ...opt,
          id: opt.id || `option-${crypto.randomUUID()}`,
          order: idx,
        })),
      }

      return [...prev, newQuestion]
    })
  }, [])

  const updateQuestion = useCallback((id: string, data: QuestionFormData): void => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              type: data.type,
              question_text: data.question_text,
              question_image_url: data.question_image_url || undefined,
              question_image_alt: data.question_image_alt || undefined,
              explanation: data.explanation || undefined,
              points: data.points || DEFAULT_QUESTION_POINTS,
              options: data.options.map((opt, idx) => ({
                ...opt,
                id: opt.id || `option-${crypto.randomUUID()}`,
                order: idx,
              })),
            }
          : q,
      ),
    )
  }, [])

  const deleteQuestion = useCallback((id: string): void => {
    setQuestions((prev) => {
      const filtered = prev.filter((q) => q.id !== id)
      return filtered.map((q, idx) => ({ ...q, order: idx }))
    })
  }, [])

  const reorderQuestions = useCallback((startIndex: number, endIndex: number): void => {
    setQuestions((prev) => {
      const result = Array.from(prev)
      const [removed] = result.splice(startIndex, 1)
      if (!removed) return prev
      result.splice(endIndex, 0, removed)
      return result.map((q, idx) => ({ ...q, order: idx }))
    })
  }, [])

  return {
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  }
}
