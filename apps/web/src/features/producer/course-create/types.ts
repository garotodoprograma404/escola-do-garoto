import { z } from 'zod'
import {
  isUploadedFilePath,
  isVideoLessonUrlSupported,
  normalizeFileLessonUrl,
} from './lib/video-url'

// Link http(s) ou arquivo enviado pela nossa API (`/api/files/public/...`, que não é uma URL absoluta).
const urlOrUploadedFile = (message: string) =>
  z
    .string()
    .refine(
      (value) => isUploadedFilePath(value) || z.string().url().safeParse(value).success,
      message,
    )

// Validation schemas
export const basicInfoSchema = z.object({
  title: z.string().min(5, 'Título deve ter no mínimo 5 caracteres'),
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug deve conter apenas letras minúsculas, números e hífens (sem hífen no início/fim)',
    ),
  short_description: z
    .string()
    .min(20, 'Descrição curta deve ter no mínimo 20 caracteres')
    .max(5000, 'Descrição curta deve ter no máximo 5000 caracteres'),
  description: z.string().min(50, 'Descrição completa deve ter no mínimo 50 caracteres'),
  category_id: z
    .string()
    .min(1, 'Selecione uma categoria')
    .regex(/^\d+$/, 'Categoria inválida')
    .refine((value) => Number.parseInt(value, 10) > 0, 'Categoria inválida'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  thumbnail_url: urlOrUploadedFile('URL da thumbnail inválida').optional().or(z.literal('')),
  cover_image_url: urlOrUploadedFile('URL da capa inválida').optional().or(z.literal('')),
  trailer_url: urlOrUploadedFile('URL do vídeo inválida').optional().or(z.literal('')),
})

export const contentSchema = z.object({
  what_you_will_learn: z
    .array(z.string().min(1))
    .min(3, 'Adicione pelo menos 3 itens do que o aluno vai aprender'),
  requirements: z.array(z.string().min(1)).min(1, 'Adicione pelo menos 1 requisito'),
  target_audience: z.array(z.string().min(1)).min(1, 'Adicione pelo menos 1 público-alvo'),
})

// Base pricing schema (sem refine para permitir merge)
const basePricingSchema = z.object({
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
  is_free: z.boolean(),
  discount_price: z
    .number()
    .min(0, 'Preço promocional deve ser maior ou igual a 0')
    .optional()
    .nullable(),
  has_lifetime_access: z.boolean().default(true),
  has_certificate: z.boolean().default(true),
})

function applyPricingRules(pricing: z.infer<typeof basePricingSchema>, ctx: z.RefinementCtx): void {
  if (pricing.discount_price !== null && pricing.discount_price !== undefined) {
    if (pricing.discount_price >= pricing.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preço promocional deve ser menor que o preço de lista',
        path: ['discount_price'],
      })
    }
  }

  if (!pricing.is_free && pricing.price < 9.9) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Preço mínimo para cursos pagos é R$ 9,90',
      path: ['price'],
    })
  }

  if (pricing.is_free && pricing.discount_price !== null && pricing.discount_price !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Curso gratuito não pode ter preço promocional',
      path: ['discount_price'],
    })
  }
}

// Pricing schema com validações (para uso no formulário)
export const pricingSchema = basePricingSchema.superRefine(applyPricingRules)

// Quiz validation schemas
const quizOptionSchema = z.object({
  id: z.string(),
  option_text: z.string().min(1, 'Texto da opção é obrigatório'),
  is_correct: z.boolean(),
  order: z.number(),
})

const quizQuestionSchema = z
  .object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'multiple_answer', 'true_false']),
    question_text: z.string().min(3, 'Enunciado deve ter no mínimo 3 caracteres'),
    question_image_url: z
      .string()
      .trim()
      .max(2048, 'URL da imagem muito longa')
      .refine(
        (value) => isUploadedFilePath(value) || z.string().url().safeParse(value).success,
        'URL da imagem da questão inválida',
      )
      .optional()
      .or(z.literal('')),
    question_image_alt: z
      .string()
      .trim()
      .max(180, 'Texto alternativo deve ter no máximo 180 caracteres')
      .optional(),
    explanation: z.string().optional(),
    points: z.number().min(1, 'Pontuação deve ser maior que 0'),
    order: z.number(),
    options: z.array(quizOptionSchema),
  })
  .superRefine((question, ctx) => {
    if (
      question.question_image_url &&
      !question.question_image_url.startsWith('https://') &&
      !isUploadedFilePath(question.question_image_url)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A imagem da questão deve usar URL segura (https)',
        path: ['question_image_url'],
      })
    }

    if (question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Questão objetiva deve ter pelo menos 2 opções',
        path: ['options'],
      })
      return
    }

    const correctOptions = question.options.filter((option) => option.is_correct)
    if (correctOptions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Marque ao menos uma alternativa correta',
        path: ['options'],
      })
    }

    if (question.type === 'multiple_choice' && correctOptions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Múltipla escolha deve ter exatamente 1 alternativa correta',
        path: ['options'],
      })
    }

    if (question.type === 'true_false' && correctOptions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Verdadeiro/Falso deve ter exatamente 1 alternativa correta',
        path: ['options'],
      })
    }

    if (question.type === 'true_false' && question.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Verdadeiro/Falso deve ter exatamente 2 opções',
        path: ['options'],
      })
    }
  })

const quizSettingsSchema = z.object({
  passing_score: z.number().min(0).max(100, 'Nota deve estar entre 0 e 100'),
  time_limit_minutes: z.number().min(1).optional(),
  allow_retake: z.boolean(),
  show_answers_after: z.boolean(),
  shuffle_questions: z.boolean(),
  shuffle_options: z.boolean(),
})

const curriculumBaseSchema = z.object({
  modules: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(3, 'Título do módulo deve ter no mínimo 3 caracteres'),
        description: z.string().optional(),
        order: z.number(),
        lessons: z.array(
          z.object({
            id: z.string(),
            title: z.string().min(3, 'Título da aula deve ter no mínimo 3 caracteres'),
            description: z.string().optional(),
            type: z.enum(['video', 'text', 'quiz', 'file']),
            duration_minutes: z.number().min(1, 'Duração deve ser maior que 0'),
            order: z.number(),
            is_preview: z.boolean(),
            content_url: z.string().optional(),
            content_text: z.string().optional(),
            quiz_questions: z.array(quizQuestionSchema).optional(),
            quiz_settings: quizSettingsSchema.optional(),
          }),
        ),
      }),
    )
    .min(1, 'Adicione pelo menos 1 módulo'),
})

function applyCurriculumRules(
  curriculum: z.infer<typeof curriculumBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  curriculum.modules.forEach((module, moduleIndex) => {
    module.lessons.forEach((lesson, lessonIndex) => {
      if (lesson.type === 'video') {
        if (!lesson.content_url?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL é obrigatória para vídeo',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_url'],
          })
        } else if (!isVideoLessonUrlSupported(lesson.content_url)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Use uma URL válida de YouTube, Vimeo ou arquivo direto (.mp4, .webm, .ogg, .m3u8, .mpd)',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_url'],
          })
        }
      }

      if (lesson.type === 'file') {
        if (!lesson.content_url?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL é obrigatória para arquivo',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_url'],
          })
        } else if (!normalizeFileLessonUrl(lesson.content_url)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL inválida para arquivo',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_url'],
          })
        }
      }

      if (lesson.type === 'text') {
        const plainText = (lesson.content_text || '').replace(/<[^>]*>/g, '').trim()
        if (!plainText) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Conteúdo de texto é obrigatório',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_text'],
          })
        } else if (plainText.length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Conteúdo deve ter no mínimo 10 caracteres',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'content_text'],
          })
        }
      }

      if (lesson.type === 'quiz') {
        if (!lesson.quiz_settings) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Configurações do quiz são obrigatórias',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'quiz_settings'],
          })
        }

        if (!lesson.quiz_questions || lesson.quiz_questions.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Quiz deve ter pelo menos 1 questão',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'quiz_questions'],
          })
        }
      }
    })
  })
}

export const curriculumSchema = curriculumBaseSchema.superRefine(applyCurriculumRules)

// Complete course schema
export const completeCourseSchema = basicInfoSchema
  .merge(contentSchema)
  .merge(basePricingSchema)
  .merge(curriculumBaseSchema)
  .superRefine((data, ctx) => {
    applyPricingRules(
      {
        price: data.price,
        is_free: data.is_free,
        discount_price: data.discount_price,
        has_lifetime_access: data.has_lifetime_access,
        has_certificate: data.has_certificate,
      },
      ctx,
    )

    applyCurriculumRules({ modules: data.modules }, ctx)
  })

// Types inferred from schemas
export type BasicInfoFormData = z.infer<typeof basicInfoSchema>
export type ContentFormData = z.infer<typeof contentSchema>
export type PricingFormData = z.infer<typeof pricingSchema>
export type CompleteCourseFormData = z.infer<typeof completeCourseSchema>

// Wizard steps
export type WizardStep = 'basic' | 'content' | 'curriculum' | 'pricing' | 'review'

// Module and Lesson types
export interface Module {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  description?: string
  type: 'video' | 'text' | 'quiz' | 'file'
  duration_minutes: number
  order: number
  is_preview: boolean
  content_url?: string // Para vídeo e arquivo
  content_text?: string // Para texto
  quiz_questions?: Array<{
    id: string
    type: 'multiple_choice' | 'multiple_answer' | 'true_false'
    question_text: string
    question_image_url?: string
    question_image_alt?: string
    explanation?: string
    points: number
    order: number
    options: Array<{
      id: string
      option_text: string
      is_correct: boolean
      order: number
    }>
  }>
  quiz_settings?: {
    passing_score: number
    time_limit_minutes?: number
    allow_retake: boolean
    show_answers_after: boolean
    shuffle_questions: boolean
    shuffle_options: boolean
  }
}
