import {
  basicInfoSchema,
  contentSchema,
  curriculumSchema,
  pricingSchema,
  type CompleteCourseFormData,
  type WizardStep,
} from '../types'

/** Etapas do assistente de curso (o mesmo para o produtor e para o admin). */
export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'basic', label: 'Informações Básicas' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'curriculum', label: 'Currículo' },
  { id: 'pricing', label: 'Preço' },
  { id: 'review', label: 'Revisão' },
]

/**
 * Resumo em texto do currículo. Se não mudou desde que a tela abriu, o envio pula a regravação de
 * módulos e aulas (e preserva os ids, o progresso e as matrículas já feitas).
 */
export function buildCurriculumSignature(modules: CompleteCourseFormData['modules'] | undefined) {
  if (!modules || modules.length === 0) {
    return '[]'
  }

  return JSON.stringify(
    modules.map((moduleItem) => ({
      title: moduleItem.title,
      description: moduleItem.description || '',
      order: moduleItem.order,
      lessons: moduleItem.lessons.map((lesson) => ({
        title: lesson.title,
        description: lesson.description || '',
        type: lesson.type,
        duration_minutes: lesson.duration_minutes,
        order: lesson.order,
        is_preview: lesson.is_preview,
        content_url: lesson.content_url || '',
        content_text: lesson.content_text || '',
        quiz_settings: lesson.quiz_settings
          ? {
              passing_score: lesson.quiz_settings.passing_score,
              time_limit_minutes: lesson.quiz_settings.time_limit_minutes ?? null,
              allow_retake: lesson.quiz_settings.allow_retake,
              show_answers_after: lesson.quiz_settings.show_answers_after,
              shuffle_questions: lesson.quiz_settings.shuffle_questions,
              shuffle_options: lesson.quiz_settings.shuffle_options,
            }
          : null,
        quiz_questions: (lesson.quiz_questions || []).map((question) => ({
          type: question.type,
          question_text: question.question_text,
          question_image_url: question.question_image_url || '',
          question_image_alt: question.question_image_alt || '',
          explanation: question.explanation || '',
          points: question.points,
          order: question.order,
          options: (question.options || []).map((option) => ({
            option_text: option.option_text,
            is_correct: option.is_correct,
            order: option.order,
          })),
        })),
      })),
    })),
  )
}

/** Primeira mensagem de erro da etapa atual, ou `null` se os dados dela estão válidos. */
export function getStepValidationError(
  step: WizardStep,
  formData: Partial<CompleteCourseFormData>,
): string | null {
  const firstError = (
    result: { success: true } | { success: false; error: { errors: { message: string }[] } },
  ) => (result.success ? null : result.error.errors[0]?.message || null)

  switch (step) {
    case 'basic':
      return firstError(
        basicInfoSchema.safeParse({
          title: formData.title || '',
          slug: formData.slug || '',
          short_description: formData.short_description || '',
          description: formData.description || '',
          category_id: formData.category_id || '',
          level: formData.level || 'beginner',
          thumbnail_url: formData.thumbnail_url || '',
          cover_image_url: formData.cover_image_url || '',
          trailer_url: formData.trailer_url || '',
        }),
      )
    case 'content':
      return firstError(
        contentSchema.safeParse({
          what_you_will_learn: formData.what_you_will_learn || [],
          requirements: formData.requirements || [],
          target_audience: formData.target_audience || [],
        }),
      )
    case 'curriculum':
      return firstError(curriculumSchema.safeParse({ modules: formData.modules || [] }))
    case 'pricing':
      return firstError(
        pricingSchema.safeParse({
          price: formData.price || 0,
          is_free: formData.is_free || false,
          discount_price: formData.discount_price ?? null,
          has_lifetime_access: formData.has_lifetime_access ?? true,
          has_certificate: formData.has_certificate ?? true,
        }),
      )
    default:
      return null
  }
}
