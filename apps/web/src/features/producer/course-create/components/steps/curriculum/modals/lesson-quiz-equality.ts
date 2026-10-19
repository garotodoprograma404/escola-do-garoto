import type { LessonFormData } from '../types'

/** Duas listas de questões têm exatamente o mesmo conteúdo (evita regravar o formulário à toa). */
export function areQuizQuestionsEqual(
  a: NonNullable<LessonFormData['quiz_questions']>,
  b: NonNullable<LessonFormData['quiz_questions']>,
): boolean {
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

/** As configurações do quiz são iguais (ou as duas estão ausentes). */
export function areQuizSettingsEqual(
  a?: LessonFormData['quiz_settings'],
  b?: LessonFormData['quiz_settings'],
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false

  return (
    a.passing_score === b.passing_score &&
    a.time_limit_minutes === b.time_limit_minutes &&
    a.allow_retake === b.allow_retake &&
    a.show_answers_after === b.show_answers_after &&
    a.shuffle_questions === b.shuffle_questions &&
    a.shuffle_options === b.shuffle_options
  )
}
