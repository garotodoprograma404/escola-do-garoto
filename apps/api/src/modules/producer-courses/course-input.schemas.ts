import { z } from 'zod'
import { htmlToPlainText } from './html-sanitizer.js'
import { isAllowedAssetUrl, normalizeFileLessonUrl, normalizeVideoLessonUrl } from './lesson-url.js'

/**
 * Schemas de entrada do assistente de criação/edição de curso (produtor e admin).
 * As regras são validadas no servidor (o front pode ser burlado), com tetos de tamanho para
 * módulos, aulas e itens.
 */

export const MAX_MODULES = 100
export const MAX_LESSONS_PER_MODULE = 300
export const MAX_QUESTIONS_PER_QUIZ = 200
export const MAX_OPTIONS_PER_QUESTION = 12
/** `numeric(10,2)`: o maior valor que cabe na coluna. */
export const MAX_PRICE = 99_999_999.99
const MIN_PAID_PRICE = 9.9

export const slugSchema = z
  .string()
  .trim()
  .min(3, 'Slug deve ter no mínimo 3 caracteres')
  .max(120, 'Slug deve ter no máximo 120 caracteres')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug deve conter apenas letras minúsculas, números e hífens (sem hífen no início/fim)',
  )

export const levelSchema = z.enum(['beginner', 'intermediate', 'advanced'])

const optionalAssetUrl = (message: string) =>
  z.union([z.literal(''), z.string().trim().max(2048).refine(isAllowedAssetUrl, message)]).nullish()

export const moneySchema = (label: string) =>
  z
    .number({ error: `${label} inválido` })
    .finite(`${label} inválido`)
    .min(0, `${label} deve ser maior ou igual a 0`)
    .max(MAX_PRICE, `${label} acima do limite permitido`)

const stringListSchema = (min: number, minMessage: string) =>
  z
    .array(z.string().trim().min(1, 'Item vazio').max(500, 'Item muito longo'))
    .min(min, minMessage)
    .max(50, 'Itens demais')

const quizOptionSchema = z.object({
  id: z.string().max(100).optional(),
  option_text: z.string().trim().min(1, 'Texto da opção é obrigatório').max(1000),
  is_correct: z.boolean(),
  order: z.number().int().min(0).max(100_000),
})

const quizQuestionSchema = z
  .object({
    id: z.string().max(100).optional(),
    type: z.enum(['multiple_choice', 'multiple_answer', 'true_false']),
    question_text: z.string().trim().min(3, 'Enunciado deve ter no mínimo 3 caracteres').max(5000),
    question_image_url: z
      .union([
        z.literal(''),
        z
          .string()
          .trim()
          .max(2048, 'URL da imagem muito longa')
          .refine(isAllowedAssetUrl, 'URL da imagem da questão inválida'),
      ])
      .nullish(),
    question_image_alt: z
      .string()
      .trim()
      .max(180, 'Texto alternativo deve ter no máximo 180 caracteres')
      .nullish(),
    explanation: z.string().max(5000).nullish(),
    points: z
      .number()
      .int('Pontuação deve ser inteira')
      .min(1, 'Pontuação deve ser maior que 0')
      .max(1000),
    order: z.number().int().min(0).max(100_000),
    options: z.array(quizOptionSchema).max(MAX_OPTIONS_PER_QUESTION, 'Alternativas demais'),
  })
  .superRefine((question, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: 'custom', message, path: [path] })

    if (question.options.length < 2) {
      fail('Questão objetiva deve ter pelo menos 2 opções', 'options')
      return
    }
    const correct = question.options.filter((option) => option.is_correct).length
    if (correct === 0) fail('Marque ao menos uma alternativa correta', 'options')
    if (question.type === 'multiple_choice' && correct !== 1) {
      fail('Múltipla escolha deve ter exatamente 1 alternativa correta', 'options')
    }
    if (question.type === 'true_false' && correct !== 1) {
      fail('Verdadeiro/Falso deve ter exatamente 1 alternativa correta', 'options')
    }
    if (question.type === 'true_false' && question.options.length !== 2) {
      fail('Verdadeiro/Falso deve ter exatamente 2 opções', 'options')
    }
  })

const quizSettingsSchema = z.object({
  passing_score: z.number().int().min(0).max(100, 'Nota deve estar entre 0 e 100'),
  time_limit_minutes: z.number().int().min(1).max(10_000).nullish(),
  allow_retake: z.boolean(),
  show_answers_after: z.boolean(),
  shuffle_questions: z.boolean(),
  shuffle_options: z.boolean(),
})

const lessonSchema = z
  .object({
    id: z.string().max(100).optional(),
    title: z.string().trim().min(3, 'Título da aula deve ter no mínimo 3 caracteres').max(300),
    description: z.string().max(5000).nullish(),
    type: z.enum(['video', 'text', 'quiz', 'file']),
    duration_minutes: z
      .number()
      .int('Duração deve ser inteira')
      .min(1, 'Duração deve ser maior que 0')
      .max(100_000),
    order: z.number().int().min(0).max(100_000),
    is_preview: z.boolean(),
    content_url: z.string().trim().max(2048).nullish(),
    content_text: z.string().max(500_000).nullish(),
    quiz_questions: z.array(quizQuestionSchema).max(MAX_QUESTIONS_PER_QUIZ).optional(),
    quiz_settings: quizSettingsSchema.optional(),
  })
  .superRefine((lesson, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: 'custom', message, path: [path] })
    const url = lesson.content_url?.trim() ?? ''

    if (lesson.type === 'video') {
      if (!url) fail('URL é obrigatória para vídeo', 'content_url')
      else if (!normalizeVideoLessonUrl(url)) {
        fail(
          'Use uma URL válida de YouTube, Vimeo ou arquivo direto (.mp4, .webm, .ogg, .m3u8, .mpd)',
          'content_url',
        )
      }
    }
    if (lesson.type === 'file') {
      if (!url) fail('URL é obrigatória para arquivo', 'content_url')
      else if (!normalizeFileLessonUrl(url)) fail('URL inválida para arquivo', 'content_url')
    }
    if (lesson.type === 'text') {
      const plain = htmlToPlainText(lesson.content_text)
      if (!plain) fail('Conteúdo de texto é obrigatório', 'content_text')
      else if (plain.length < 10) fail('Conteúdo deve ter no mínimo 10 caracteres', 'content_text')
    }
    if (lesson.type === 'quiz') {
      if (!lesson.quiz_settings) fail('Configurações do quiz são obrigatórias', 'quiz_settings')
      if (!lesson.quiz_questions || lesson.quiz_questions.length === 0) {
        fail('Quiz deve ter pelo menos 1 questão', 'quiz_questions')
      }
    }
  })

const moduleSchema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(3, 'Título do módulo deve ter no mínimo 3 caracteres').max(300),
  description: z.string().max(5000).nullish(),
  order: z.number().int().min(0).max(100_000),
  lessons: z.array(lessonSchema).max(MAX_LESSONS_PER_MODULE),
})

export const completeCourseSchema = z
  .object({
    // Dados básicos
    title: z
      .string()
      .trim()
      .min(5, 'Título deve ter no mínimo 5 caracteres')
      .max(180, 'Título muito longo'),
    slug: slugSchema,
    short_description: z
      .string()
      .trim()
      .min(20, 'Descrição curta deve ter no mínimo 20 caracteres')
      .max(5000, 'Descrição curta deve ter no máximo 5000 caracteres'),
    description: z
      .string()
      .trim()
      .min(50, 'Descrição completa deve ter no mínimo 50 caracteres')
      .max(50_000, 'Descrição completa muito longa'),
    category_id: z
      .string()
      .min(1, 'Selecione uma categoria')
      .regex(/^\d{1,15}$/, 'Categoria inválida')
      .refine((value) => Number.parseInt(value, 10) > 0, 'Categoria inválida'),
    level: levelSchema,
    thumbnail_url: optionalAssetUrl('URL da thumbnail inválida'),
    cover_image_url: optionalAssetUrl('URL da capa inválida'),
    trailer_url: optionalAssetUrl('URL do vídeo inválida'),
    // Conteúdo
    what_you_will_learn: stringListSchema(
      3,
      'Adicione pelo menos 3 itens do que o aluno vai aprender',
    ),
    requirements: stringListSchema(1, 'Adicione pelo menos 1 requisito'),
    target_audience: stringListSchema(1, 'Adicione pelo menos 1 público-alvo'),
    // Preço
    price: moneySchema('Preço'),
    is_free: z.boolean(),
    discount_price: moneySchema('Preço promocional').nullish(),
    has_lifetime_access: z.boolean().default(true),
    has_certificate: z.boolean().default(true),
    // Currículo
    modules: z
      .array(moduleSchema)
      .min(1, 'Adicione pelo menos 1 módulo')
      .max(MAX_MODULES, 'Módulos demais'),
  })
  .superRefine((data, ctx) => {
    const fail = (message: string, path: string) =>
      ctx.addIssue({ code: 'custom', message, path: [path] })
    const priceCents = toCents(data.price)
    const hasDiscount = data.discount_price !== null && data.discount_price !== undefined

    if (hasDiscount && toCents(data.discount_price!) >= priceCents) {
      fail('Preço promocional deve ser menor que o preço de lista', 'discount_price')
    }
    if (!data.is_free && priceCents < Math.round(MIN_PAID_PRICE * 100)) {
      fail('Preço mínimo para cursos pagos é R$ 9,90', 'price')
    }
    if (data.is_free && hasDiscount)
      fail('Curso gratuito não pode ter preço promocional', 'discount_price')
  })

export type CompleteCourseInput = z.infer<typeof completeCourseSchema>

/** Rascunho: o front manda o que tiver; normalizamos no servidor (ver `draft-normalizer.ts`). */
export const draftCourseSchema = z.looseObject({})

export const courseIdParamSchema = z.object({
  id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})

const updateCourseOptionsSchema = z
  .object({ skipCurriculumUpdate: z.boolean().optional() })
  .optional()

export const updateCourseBodySchema = z.object({
  data: completeCourseSchema,
  options: updateCourseOptionsSchema,
})
export type UpdateCourseBody = z.infer<typeof updateCourseBodySchema>

export const producerCoursesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected', 'archived']).optional(),
  sortBy: z.enum(['created_at', 'title', 'students', 'revenue']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
export type ProducerCoursesQuery = z.infer<typeof producerCoursesQuerySchema>

/** Preço em reais → centavos inteiros (a conta de dinheiro nunca é feita em decimal). */
export function toCents(value: number): number {
  return Math.round(value * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}
