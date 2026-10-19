import { BadRequestException } from '@nestjs/common'
import {
  MAX_LESSONS_PER_MODULE,
  MAX_MODULES,
  MAX_OPTIONS_PER_QUESTION,
  MAX_PRICE,
  MAX_QUESTIONS_PER_QUIZ,
  toCents,
  type CompleteCourseInput,
} from './course-input.schemas.js'
import { sanitizeLessonHtml } from './html-sanitizer.js'
import {
  isAllowedAssetUrl,
  normalizeFileLessonUrl,
  normalizeVideoLessonUrl,
  toHttpsImageUrl,
} from './lesson-url.js'

/**
 * Modelo interno do curso (camelCase, já normalizado e sanitizado). Tanto a criação completa
 * (`completeCourseSchema`) quanto o rascunho (entrada frouxa) viram isto antes de ir para o banco.
 */

type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false'
type LessonType = 'video' | 'text' | 'quiz' | 'file'
type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

type QuizOptionData = { optionText: string; isCorrect: boolean; displayOrder: number }

type QuizQuestionData = {
  type: QuestionType
  questionText: string
  questionImageUrl: string | null
  questionImageAlt: string | null
  explanation: string | null
  points: number
  displayOrder: number
  options: QuizOptionData[]
}

type QuizSettingsData = {
  passingScore: number
  timeLimitMinutes: number | null
  allowRetake: boolean
  showAnswersAfter: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

export type LessonData = {
  /** Id que o front mandou (`lesson-123` = aula já existente; qualquer outra coisa = nova). */
  clientId: string | null
  title: string
  description: string | null
  type: LessonType
  durationMinutes: number
  displayOrder: number
  isFreePreview: boolean
  contentUrl: string | null
  contentText: string | null
  quizSettings: QuizSettingsData | null
  quizQuestions: QuizQuestionData[]
}

export type ModuleData = {
  clientId: string | null
  title: string
  description: string | null
  displayOrder: number
  lessons: LessonData[]
}

export type CourseData = {
  title: string
  slug: string
  shortDescription: string | null
  description: string
  /** `null` só em rascunho (o serviço escolhe a primeira categoria ativa). */
  categoryId: number | null
  level: CourseLevel
  thumbnailUrl: string | null
  coverImageUrl: string | null
  trailerUrl: string | null
  price: number
  discountPrice: number | null
  hasLifetimeAccess: boolean
  hasCertificate: boolean
  whatYouWillLearn: string[] | null
  requirements: string[] | null
  targetAudience: string[] | null
  modules: ModuleData[]
}

const DEFAULT_QUIZ_SETTINGS: QuizSettingsData = {
  passingScore: 0,
  timeLimitMinutes: null,
  allowRetake: true,
  showAnswersAfter: true,
  shuffleQuestions: false,
  shuffleOptions: false,
}

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

/** Texto da imagem de questão: https obrigatório (o banco recusa o resto). */
function resolveQuestionImage(raw: string | null | undefined, webOrigin: string): string | null {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return null
  const resolved = toHttpsImageUrl(trimmed, webOrigin)
  if (!resolved) {
    throw new BadRequestException(
      'A imagem da questão precisa de uma URL segura (https). Use um link https ou envie o arquivo em um ambiente com HTTPS.',
    )
  }
  return resolved
}

function lessonContentUrl(type: LessonType, raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? ''
  if (type === 'video') return normalizeVideoLessonUrl(trimmed)
  if (type === 'file') return normalizeFileLessonUrl(trimmed)
  return null
}

/** Entrada validada (`completeCourseSchema`) → modelo interno. */
export function courseDataFromComplete(input: CompleteCourseInput, webOrigin: string): CourseData {
  const priceCents = input.is_free ? 0 : toCents(input.price)
  const hasDiscount =
    !input.is_free && input.discount_price !== null && input.discount_price !== undefined
  // Preço promocional 0 vale como "sem promoção" (equivale a `discount_price || null`).
  const discountCents = hasDiscount ? toCents(input.discount_price!) : 0

  return {
    title: input.title,
    slug: input.slug,
    shortDescription: input.short_description,
    description: input.description,
    categoryId: Number.parseInt(input.category_id, 10),
    level: input.level,
    thumbnailUrl: emptyToNull(input.thumbnail_url),
    coverImageUrl: emptyToNull(input.cover_image_url),
    trailerUrl: emptyToNull(input.trailer_url),
    price: priceCents / 100,
    discountPrice: discountCents > 0 ? discountCents / 100 : null,
    hasLifetimeAccess: input.has_lifetime_access,
    hasCertificate: input.has_certificate,
    whatYouWillLearn: input.what_you_will_learn,
    requirements: input.requirements,
    targetAudience: input.target_audience,
    modules: input.modules.map((module) => ({
      clientId: module.id ?? null,
      title: module.title,
      description: emptyToNull(module.description),
      displayOrder: module.order,
      lessons: module.lessons.map((lesson): LessonData => {
        const isQuiz = lesson.type === 'quiz'
        return {
          clientId: lesson.id ?? null,
          title: lesson.title,
          description: emptyToNull(lesson.description),
          type: lesson.type,
          durationMinutes: lesson.duration_minutes,
          displayOrder: lesson.order,
          isFreePreview: lesson.is_preview,
          contentUrl: lessonContentUrl(lesson.type, lesson.content_url),
          contentText:
            lesson.type === 'text' && lesson.content_text
              ? emptyToNull(sanitizeLessonHtml(lesson.content_text))
              : null,
          quizSettings: isQuiz
            ? {
                passingScore:
                  lesson.quiz_settings?.passing_score ?? DEFAULT_QUIZ_SETTINGS.passingScore,
                timeLimitMinutes: lesson.quiz_settings?.time_limit_minutes ?? null,
                allowRetake:
                  lesson.quiz_settings?.allow_retake ?? DEFAULT_QUIZ_SETTINGS.allowRetake,
                showAnswersAfter:
                  lesson.quiz_settings?.show_answers_after ??
                  DEFAULT_QUIZ_SETTINGS.showAnswersAfter,
                shuffleQuestions:
                  lesson.quiz_settings?.shuffle_questions ?? DEFAULT_QUIZ_SETTINGS.shuffleQuestions,
                shuffleOptions:
                  lesson.quiz_settings?.shuffle_options ?? DEFAULT_QUIZ_SETTINGS.shuffleOptions,
              }
            : null,
          quizQuestions: isQuiz
            ? (lesson.quiz_questions ?? []).map((question): QuizQuestionData => ({
                type: question.type,
                questionText: question.question_text,
                questionImageUrl: resolveQuestionImage(question.question_image_url, webOrigin),
                questionImageAlt: emptyToNull(question.question_image_alt),
                explanation: emptyToNull(question.explanation),
                points: question.points,
                displayOrder: question.order,
                options: question.options.map((option) => ({
                  optionText: option.option_text,
                  isCorrect: option.is_correct,
                  displayOrder: option.order,
                })),
              }))
            : [],
        }
      }),
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Rascunho: entrada frouxa (o front manda o que tiver).
// ---------------------------------------------------------------------------------------------

const COURSE_LEVELS: readonly CourseLevel[] = ['beginner', 'intermediate', 'advanced']
const LESSON_TYPES: readonly LessonType[] = ['video', 'text', 'quiz', 'file']
const QUESTION_TYPES: readonly QuestionType[] = ['multiple_choice', 'multiple_answer', 'true_false']

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asTrimmedString(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function asOptionalString(value: unknown, max = 5000): string | null {
  const normalized = asTrimmedString(value, max)
  return normalized.length > 0 ? normalized : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 50)
    .map((entry) => (typeof entry === 'string' ? entry.trim().slice(0, 500) : ''))
    .filter((entry) => entry.length > 0)
}

function asPositiveInteger(value: unknown, fallback: number, max = 100_000): number {
  let parsed: number | null = null
  if (typeof value === 'number' && Number.isInteger(value)) parsed = value
  else if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number.parseInt(value, 10)
    if (Number.isInteger(n)) parsed = n
  }
  return parsed !== null && parsed > 0 ? Math.min(parsed, max) : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function buildDraftSlug(inputSlug: unknown, inputTitle: unknown): string {
  const fromInput = slugify(asTrimmedString(inputSlug, 200))
  if (fromInput.length > 0) return fromInput
  const fromTitle = slugify(asTrimmedString(inputTitle, 200))
  if (fromTitle.length > 0) return fromTitle
  return `draft-${Date.now()}`
}

function defaultOptions(type: QuestionType): QuizOptionData[] {
  if (type === 'true_false') {
    return [
      { optionText: 'Verdadeiro', isCorrect: true, displayOrder: 1 },
      { optionText: 'Falso', isCorrect: false, displayOrder: 2 },
    ]
  }
  return [
    { optionText: 'Alternativa 1', isCorrect: true, displayOrder: 1 },
    { optionText: 'Alternativa 2', isCorrect: false, displayOrder: 2 },
  ]
}

function normalizeDraftOptions(type: QuestionType, optionsValue: unknown): QuizOptionData[] {
  const raw = Array.isArray(optionsValue) ? optionsValue.slice(0, MAX_OPTIONS_PER_QUESTION) : []
  const normalized = raw.map((value, index): QuizOptionData => {
    const option = asRecord(value)
    return {
      optionText: asTrimmedString(option.option_text, 1000) || `Alternativa ${index + 1}`,
      isCorrect: asBoolean(option.is_correct, false),
      displayOrder: asPositiveInteger(option.order, index + 1),
    }
  })
  const withMinimum = normalized.length >= 2 ? normalized : defaultOptions(type)

  // Sempre ao menos uma correta; escolha única (múltipla escolha e V/F) fica com exatamente uma.
  const firstCorrect = withMinimum.findIndex((option) => option.isCorrect)
  const safeIndex = firstCorrect >= 0 ? firstCorrect : 0
  if (type === 'multiple_choice' || type === 'true_false') {
    return withMinimum.map((option, index) => ({ ...option, isCorrect: index === safeIndex }))
  }
  return withMinimum.map((option, index) =>
    firstCorrect < 0 && index === 0 ? { ...option, isCorrect: true } : option,
  )
}

function draftLesson(value: unknown, index: number, webOrigin: string): LessonData {
  const record = asRecord(value)
  const type = oneOf(record.type, LESSON_TYPES, 'text')
  const quizSettings = asRecord(record.quiz_settings)
  const timeLimit = asPositiveInteger(quizSettings.time_limit_minutes, 0, 10_000)
  const questions = Array.isArray(record.quiz_questions)
    ? record.quiz_questions.slice(0, MAX_QUESTIONS_PER_QUIZ)
    : []
  const contentTextRaw = asOptionalString(record.content_text, 500_000)

  return {
    clientId: asOptionalString(record.id, 100),
    title: asTrimmedString(record.title, 300) || `Aula ${index + 1}`,
    description: asOptionalString(record.description),
    type,
    durationMinutes: asPositiveInteger(record.duration_minutes, 1),
    displayOrder: asPositiveInteger(record.order, index + 1),
    isFreePreview: asBoolean(record.is_preview, false),
    contentUrl: lessonContentUrl(type, asTrimmedString(record.content_url, 2048)),
    contentText:
      type === 'text' && contentTextRaw ? emptyToNull(sanitizeLessonHtml(contentTextRaw)) : null,
    quizSettings:
      type === 'quiz'
        ? {
            passingScore: Math.min(100, asPositiveInteger(quizSettings.passing_score, 0, 100)),
            timeLimitMinutes: timeLimit > 0 ? timeLimit : null,
            allowRetake: asBoolean(quizSettings.allow_retake, DEFAULT_QUIZ_SETTINGS.allowRetake),
            showAnswersAfter: asBoolean(
              quizSettings.show_answers_after,
              DEFAULT_QUIZ_SETTINGS.showAnswersAfter,
            ),
            shuffleQuestions: asBoolean(
              quizSettings.shuffle_questions,
              DEFAULT_QUIZ_SETTINGS.shuffleQuestions,
            ),
            shuffleOptions: asBoolean(
              quizSettings.shuffle_options,
              DEFAULT_QUIZ_SETTINGS.shuffleOptions,
            ),
          }
        : null,
    quizQuestions:
      type === 'quiz'
        ? questions.map((questionValue, questionIndex): QuizQuestionData => {
            const question = asRecord(questionValue)
            const questionType = oneOf(question.type, QUESTION_TYPES, 'multiple_choice')
            const imageAlt = asOptionalString(question.question_image_alt, 180)
            const imageRaw = asTrimmedString(question.question_image_url, 2048)
            // Rascunho não pode travar por causa de imagem: se não der para virar https, descarta.
            const image = imageRaw ? toHttpsImageUrl(imageRaw, webOrigin) : null
            return {
              type: questionType,
              questionText:
                asTrimmedString(question.question_text, 5000) || `Questao ${questionIndex + 1}`,
              questionImageUrl: image,
              questionImageAlt: image ? imageAlt : null,
              explanation: asOptionalString(question.explanation),
              points: asPositiveInteger(question.points, 1, 1000),
              displayOrder: asPositiveInteger(question.order, questionIndex + 1),
              options: normalizeDraftOptions(questionType, question.options),
            }
          })
        : [],
  }
}

/** Entrada solta de rascunho → modelo interno (nunca falha por campo faltando). */
export function courseDataFromDraft(rawInput: unknown, webOrigin: string): CourseData {
  const input = asRecord(rawInput)
  const title = asTrimmedString(input.title, 180) || 'Rascunho sem titulo'
  const shortDescription = asTrimmedString(input.short_description)
  const description =
    asTrimmedString(input.description, 50_000) || shortDescription || 'Curso em edicao'
  const isFree = asBoolean(input.is_free, false)

  let priceCents = 0
  if (
    !isFree &&
    typeof input.price === 'number' &&
    Number.isFinite(input.price) &&
    input.price >= 0
  ) {
    priceCents = Math.min(toCents(input.price), toCents(MAX_PRICE))
  }
  let discountCents: number | null = null
  if (
    !isFree &&
    typeof input.discount_price === 'number' &&
    Number.isFinite(input.discount_price)
  ) {
    const cents = toCents(input.discount_price)
    // Promoção só vale se for positiva e menor que o preço (o banco recusa o contrário).
    if (cents > 0 && cents < priceCents) discountCents = cents
  }

  const categoryRaw = asPositiveInteger(input.category_id, -1, Number.MAX_SAFE_INTEGER)
  const learn = asStringArray(input.what_you_will_learn)
  const requirements = asStringArray(input.requirements)
  const audience = asStringArray(input.target_audience)
  const modules = Array.isArray(input.modules) ? input.modules.slice(0, MAX_MODULES) : []

  const assetUrl = (value: unknown): string | null => {
    const raw = asTrimmedString(value, 2048)
    if (!raw) return null
    // Reaproveita a mesma regra de URL de imagem/trailer (http(s) ou arquivo enviado por nós).
    return isAllowedAssetUrl(raw) ? raw : null
  }

  return {
    title,
    slug: buildDraftSlug(input.slug, title),
    shortDescription: shortDescription || null,
    description,
    categoryId: categoryRaw > 0 ? categoryRaw : null,
    level: oneOf(input.level, COURSE_LEVELS, 'beginner'),
    thumbnailUrl: assetUrl(input.thumbnail_url),
    coverImageUrl: assetUrl(input.cover_image_url),
    trailerUrl: assetUrl(input.trailer_url),
    price: priceCents / 100,
    discountPrice: discountCents === null ? null : discountCents / 100,
    hasLifetimeAccess: asBoolean(input.has_lifetime_access, true),
    hasCertificate: asBoolean(input.has_certificate, true),
    whatYouWillLearn: learn.length > 0 ? learn : null,
    requirements: requirements.length > 0 ? requirements : null,
    targetAudience: audience.length > 0 ? audience : null,
    modules: modules.map((moduleValue, moduleIndex): ModuleData => {
      const module = asRecord(moduleValue)
      const lessons = Array.isArray(module.lessons)
        ? module.lessons.slice(0, MAX_LESSONS_PER_MODULE)
        : []
      return {
        clientId: asOptionalString(module.id, 100),
        title: asTrimmedString(module.title, 300) || `Modulo ${moduleIndex + 1}`,
        description: asOptionalString(module.description),
        displayOrder: asPositiveInteger(module.order, moduleIndex + 1),
        lessons: lessons.map((lesson, lessonIndex) => draftLesson(lesson, lessonIndex, webOrigin)),
      }
    }),
  }
}
