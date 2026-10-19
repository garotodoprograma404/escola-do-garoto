import { z } from 'zod'

/** Id numérico (bigint do catálogo) vindo de rota/query. */
export const idSchema = z.coerce
  .number({ error: 'Identificador inválido' })
  .int({ error: 'Identificador inválido' })
  .positive({ error: 'Identificador inválido' })
  .max(2_147_483_647, { error: 'Identificador inválido' })

export const uuidSchema = z.uuid({ error: 'Identificador inválido' })

/** Texto de busca: limitado; normalização (NFKC) e escape dos curingas do LIKE ficam no service. */
const searchSchema = z.string().trim().max(100).optional()

const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1)

// ---------- Progresso ----------

/** Um dia inteiro de vídeo já é mais do que qualquer aula: trava lixo e números absurdos. */
const MAX_WATCH_SECONDS = 86_400

export const saveProgressSchema = z.object({
  watchTimeSeconds: z.number().int().min(0).max(MAX_WATCH_SECONDS),
  completed: z.boolean().optional(),
})
export type SaveProgressInput = z.infer<typeof saveProgressSchema>

// ---------- Quiz ----------

export const quizLoadQuerySchema = z.object({ courseId: idSchema })

export const submitQuizSchema = z.object({
  finalize: z.boolean().default(true),
  answers: z
    .array(
      z.object({
        questionId: idSchema,
        selectedOptionIds: z.array(idSchema).max(50).default([]),
      }),
    )
    .max(200),
})
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>

// ---------- Notas de aula ----------

const noteTitleSchema = z
  .string()
  .trim()
  .min(1, 'Título é obrigatório')
  .max(200, 'Título longo demais')
const noteContentSchema = z
  .string()
  .trim()
  .min(1, 'Conteúdo é obrigatório')
  .max(10_000, 'Anotação longa demais')
const videoTimestampSchema = z.number().int().min(0).max(MAX_WATCH_SECONDS).nullish()

export const createNoteSchema = z.object({
  lessonId: idSchema,
  courseId: idSchema,
  title: noteTitleSchema,
  content: noteContentSchema,
  videoTimestamp: videoTimestampSchema,
})
export type CreateNoteInput = z.infer<typeof createNoteSchema>

export const updateNoteSchema = z.object({
  title: noteTitleSchema,
  content: noteContentSchema,
  videoTimestamp: videoTimestampSchema,
})
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

export const listNotesQuerySchema = z.object({
  course: idSchema.optional(),
  search: searchSchema,
  sort: z.enum(['recent', 'oldest']).default('recent'),
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>

// ---------- Perguntas ----------

const questionTextSchema = z
  .string()
  .trim()
  .min(10, 'A pergunta deve ter pelo menos 10 caracteres')
  .max(2000, 'A pergunta deve ter no máximo 2000 caracteres')

export const askQuestionSchema = z.object({
  courseId: idSchema,
  lessonId: idSchema,
  question: questionTextSchema,
  isPublic: z.boolean().default(true),
})
export type AskQuestionInput = z.infer<typeof askQuestionSchema>

export const updateQuestionSchema = z.object({
  question: questionTextSchema,
  isPublic: z.boolean().optional(),
})
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>

export const lessonQuestionsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type LessonQuestionsQuery = z.infer<typeof lessonQuestionsQuerySchema>

export const listQuestionsQuerySchema = z.object({
  course: idSchema.optional(),
  search: searchSchema,
  status: z.enum(['all', 'pending', 'answered']).default('all'),
  page: pageSchema,
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>

// ---------- Avaliação do curso ----------

export const saveReviewSchema = z.object({
  rating: z.number().int().min(1, 'A nota vai de 1 a 5').max(5, 'A nota vai de 1 a 5'),
  title: z.string().trim().max(200, 'Título longo demais').nullish(),
  review: z.string().trim().max(2000, 'Avaliação longa demais').nullish(),
})
export type SaveReviewInput = z.infer<typeof saveReviewSchema>
