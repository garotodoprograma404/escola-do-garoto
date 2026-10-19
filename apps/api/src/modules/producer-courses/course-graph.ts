import { BadRequestException, ConflictException } from '@nestjs/common'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { DbExecutor } from '../../database/database.module.js'
import {
  courseLessons,
  courseModules,
  courses,
  quizOptions,
  quizQuestions,
  quizSettings,
} from '../../database/schema/index.js'
import type { CourseData, LessonData, ModuleData } from './course-data.js'

/**
 * Gravação e leitura do "grafo" do curso: curso + módulos + aulas + quiz. Tudo recebe o executor
 * (banco ou transação): quem chama abre UMA transação por operação.
 */

type PgError = { code?: string; constraint?: string; constraint_name?: string; cause?: unknown }

function pgErrorOf(error: unknown): PgError | null {
  const direct = error as PgError | null
  if (direct?.code) return direct
  const cause = (error as { cause?: unknown } | null)?.cause as PgError | undefined
  return cause?.code ? cause : null
}

/** Traduz erros de constraint do Postgres em respostas HTTP claras (o resto sobe como está). */
export function rethrowCourseWriteError(error: unknown): never {
  const pg = pgErrorOf(error)
  const constraint = pg?.constraint ?? pg?.constraint_name ?? ''
  if (pg?.code === '23505' && constraint === 'courses_slug_key') {
    throw new ConflictException('Este slug já está em uso. Escolha outra URL para o curso.')
  }
  if (pg?.code === '23503' && constraint === 'courses_category_id_fkey') {
    throw new BadRequestException('Categoria inválida. Selecione uma categoria ativa.')
  }
  if (pg?.code === '23514' && constraint.startsWith('courses_')) {
    throw new BadRequestException('Preço inválido: o preço promocional deve ser menor que o preço.')
  }
  throw error
}

export type CourseAdminSettings = {
  isFeatured: boolean
  couponsEnabled: boolean
  priceLockedByAdmin: boolean
  adminNotes: string | null
}

export type NewCourseOptions = {
  producerId: string
  status: 'draft' | 'pending_review' | 'approved'
  isPublished?: boolean
  admin?: CourseAdminSettings
}

/** Cria só a linha do curso. `data.categoryId` precisa estar resolvido. */
export async function insertCourseRow(
  tx: DbExecutor,
  data: CourseData & { categoryId: number },
  options: NewCourseOptions,
): Promise<{ id: number; slug: string }> {
  const published = options.isPublished ?? false
  try {
    const [created] = await tx
      .insert(courses)
      .values({
        producerId: options.producerId,
        categoryId: data.categoryId,
        title: data.title,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        coverImageUrl: data.coverImageUrl,
        trailerUrl: data.trailerUrl,
        level: data.level,
        price: data.price,
        discountPrice: data.discountPrice,
        hasLifetimeAccess: data.hasLifetimeAccess,
        hasCertificate: data.hasCertificate,
        whatYouWillLearn: data.whatYouWillLearn,
        requirements: data.requirements,
        targetAudience: data.targetAudience,
        status: options.status,
        isPublished: published,
        publishedAt: published ? new Date() : null,
        ...(options.admin
          ? {
              isFeatured: options.admin.isFeatured,
              couponsEnabled: options.admin.couponsEnabled,
              priceLockedByAdmin: options.admin.priceLockedByAdmin,
              adminNotes: options.admin.adminNotes,
            }
          : {}),
      })
      .returning({ id: courses.id, slug: courses.slug })
    return created!
  } catch (error) {
    return rethrowCourseWriteError(error)
  }
}

/** `module-123` / `lesson-123` → 123. Qualquer outra coisa (ex.: uuid de item novo) → null. */
function parseExistingId(clientId: string | null, prefix: 'module' | 'lesson'): number | null {
  if (!clientId) return null
  const match = new RegExp(`^${prefix}-(\\d{1,15})$`).exec(clientId)
  return match ? Number.parseInt(match[1]!, 10) : null
}

export type SyncCurriculumOptions = {
  /**
   * `true`/`false`: força `is_published` em TODOS os módulos e aulas (admin editando curso).
   * `undefined`: itens novos nascem despublicados e os que já existem ficam como estão.
   */
  publish?: boolean
}

/**
 * Faz o currículo do curso ficar igual ao que o assistente mandou.
 *
 * Apagar TODOS os módulos e recriá-los a cada edição levaria junto progresso, notas e tentativas de
 * quiz dos alunos. Por isso módulo/aula que já existe (id `module-N` / `lesson-N` que pertence a
 * ESTE curso) é atualizado no lugar; só o que sumiu é apagado e só o que é novo é criado.
 * Quiz (configurações, questões, alternativas) é regravado por aula.
 */
export async function syncCurriculum(
  tx: DbExecutor,
  courseId: number,
  modules: ModuleData[],
  options: SyncCurriculumOptions = {},
): Promise<void> {
  const existingModules = await tx
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
  const existingModuleIds = new Set(existingModules.map((row) => row.id))

  const existingLessons =
    existingModuleIds.size > 0
      ? await tx
          .select({ id: courseLessons.id })
          .from(courseLessons)
          .where(inArray(courseLessons.moduleId, [...existingModuleIds]))
      : []
  const existingLessonIds = new Set(existingLessons.map((row) => row.id))

  // 1) Quais itens existentes continuam (cada id só pode ser usado uma vez).
  const claimedModules = new Set<number>()
  const claimedLessons = new Set<number>()
  const resolveModule = (module: ModuleData): number | null => {
    const id = parseExistingId(module.clientId, 'module')
    if (id === null || !existingModuleIds.has(id) || claimedModules.has(id)) return null
    claimedModules.add(id)
    return id
  }
  const resolveLesson = (lesson: LessonData): number | null => {
    const id = parseExistingId(lesson.clientId, 'lesson')
    if (id === null || !existingLessonIds.has(id) || claimedLessons.has(id)) return null
    claimedLessons.add(id)
    return id
  }
  const resolvedModules = modules.map((module) => ({
    module,
    id: resolveModule(module),
    lessons: module.lessons.map((lesson) => ({ lesson, id: resolveLesson(lesson) })),
  }))

  const publishFlag = options.publish
  const now = new Date()
  const quizLessons: Array<{ lessonId: number; lesson: LessonData; isNew: boolean }> = []

  // 2) Cria/atualiza módulos e aulas, na ordem enviada.
  for (const { module, id: existingModuleId, lessons } of resolvedModules) {
    let moduleId: number
    if (existingModuleId !== null) {
      moduleId = existingModuleId
      await tx
        .update(courseModules)
        .set({
          title: module.title,
          description: module.description,
          displayOrder: module.displayOrder,
          updatedAt: now,
          ...(publishFlag === undefined ? {} : { isPublished: publishFlag }),
        })
        .where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, courseId)))
    } else {
      const [created] = await tx
        .insert(courseModules)
        .values({
          courseId,
          title: module.title,
          description: module.description,
          displayOrder: module.displayOrder,
          ...(publishFlag === undefined ? {} : { isPublished: publishFlag }),
        })
        .returning({ id: courseModules.id })
      moduleId = created!.id
    }

    for (const { lesson, id: existingLessonId } of lessons) {
      const values = {
        moduleId,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        contentUrl: lesson.contentUrl,
        contentText: lesson.contentText,
        durationMinutes: lesson.durationMinutes,
        displayOrder: lesson.displayOrder,
        isFreePreview: lesson.isFreePreview,
        ...(publishFlag === undefined ? {} : { isPublished: publishFlag }),
      }
      let lessonId: number
      if (existingLessonId !== null) {
        lessonId = existingLessonId
        await tx
          .update(courseLessons)
          .set({ ...values, updatedAt: now })
          .where(eq(courseLessons.id, lessonId))
      } else {
        const [created] = await tx
          .insert(courseLessons)
          .values(values)
          .returning({ id: courseLessons.id })
        lessonId = created!.id
      }
      if (lesson.type === 'quiz') {
        quizLessons.push({ lessonId, lesson, isNew: existingLessonId === null })
      }
    }
  }

  // 4) Apaga o que o produtor removeu. Só depois de mover/atualizar tudo: uma aula que mudou de
  //    módulo não pode ser levada pela cascata do módulo antigo.
  const orphanLessons = [...existingLessonIds].filter((id) => !claimedLessons.has(id))
  if (orphanLessons.length > 0) {
    await tx.delete(courseLessons).where(inArray(courseLessons.id, orphanLessons))
  }
  const modulesToDelete = [...existingModuleIds].filter((id) => !claimedModules.has(id))
  if (modulesToDelete.length > 0) {
    await tx.delete(courseModules).where(inArray(courseModules.id, modulesToDelete))
  }

  // 5) Quiz: zera o que as aulas que já existiam tinham (inclusive aula que deixou de ser quiz)
  //    e grava o que veio.
  const keptLessonIds = [...claimedLessons]
  if (keptLessonIds.length > 0) {
    await tx.delete(quizQuestions).where(inArray(quizQuestions.lessonId, keptLessonIds))
    await tx.delete(quizSettings).where(inArray(quizSettings.lessonId, keptLessonIds))
  }

  for (const { lessonId, lesson } of quizLessons) {
    if (lesson.quizSettings) {
      await tx.insert(quizSettings).values({
        lessonId,
        passingScore: lesson.quizSettings.passingScore,
        timeLimitMinutes: lesson.quizSettings.timeLimitMinutes,
        allowRetake: lesson.quizSettings.allowRetake,
        showAnswersAfter: lesson.quizSettings.showAnswersAfter,
        shuffleQuestions: lesson.quizSettings.shuffleQuestions,
        shuffleOptions: lesson.quizSettings.shuffleOptions,
      })
    }
    for (const question of lesson.quizQuestions) {
      const [createdQuestion] = await tx
        .insert(quizQuestions)
        .values({
          lessonId,
          type: question.type,
          questionText: question.questionText,
          questionImageUrl: question.questionImageUrl,
          questionImageAlt: question.questionImageAlt,
          explanation: question.explanation,
          points: question.points,
          displayOrder: question.displayOrder,
        })
        .returning({ id: quizQuestions.id })
      if (question.options.length > 0) {
        await tx.insert(quizOptions).values(
          question.options.map((option) => ({
            questionId: createdQuestion!.id,
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            displayOrder: option.displayOrder,
          })),
        )
      }
    }
  }
}

/** Marca (ou desmarca) módulos e aulas do curso como publicados. */
export async function setCurriculumPublished(
  tx: DbExecutor,
  courseId: number,
  published: boolean,
): Promise<void> {
  const now = new Date()
  const modules = await tx
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
  const moduleIds = modules.map((row) => row.id)
  if (moduleIds.length === 0) return
  await tx
    .update(courseModules)
    .set({ isPublished: published, updatedAt: now })
    .where(inArray(courseModules.id, moduleIds))
  await tx
    .update(courseLessons)
    .set({ isPublished: published, updatedAt: now })
    .where(inArray(courseLessons.moduleId, moduleIds))
}

/** `total_lessons` e `total_duration_minutes` sempre calculados aqui, nunca vindos do cliente. */
export async function recalculateCourseTotals(tx: DbExecutor, courseId: number): Promise<void> {
  await tx.execute(sql`
    UPDATE courses SET
      total_lessons = (
        SELECT count(*)::int FROM course_lessons l
        JOIN course_modules m ON m.id = l.module_id
        WHERE m.course_id = ${courseId}
      ),
      total_duration_minutes = (
        SELECT coalesce(sum(l.duration_minutes), 0)::int FROM course_lessons l
        JOIN course_modules m ON m.id = l.module_id
        WHERE m.course_id = ${courseId}
      )
    WHERE id = ${courseId}
  `)
}

// ---------------------------------------------------------------------------------------------
// Leitura para o assistente de edição (formato `CompleteCourseFormData` do front)
// ---------------------------------------------------------------------------------------------

export type CourseEditData = {
  title: string
  slug: string
  short_description: string
  description: string
  category_id: string
  level: 'beginner' | 'intermediate' | 'advanced'
  thumbnail_url: string
  cover_image_url: string
  trailer_url: string
  what_you_will_learn: string[]
  requirements: string[]
  target_audience: string[]
  price: number
  is_free: boolean
  discount_price: number | null
  has_lifetime_access: boolean
  has_certificate: boolean
  modules: Array<{
    id: string
    title: string
    description: string
    order: number
    lessons: Array<{
      id: string
      title: string
      description: string
      type: 'video' | 'text' | 'quiz' | 'file'
      duration_minutes: number
      order: number
      is_preview: boolean
      content_url: string
      content_text: string
      quiz_settings?: {
        passing_score: number
        time_limit_minutes?: number
        allow_retake: boolean
        show_answers_after: boolean
        shuffle_questions: boolean
        shuffle_options: boolean
      }
      quiz_questions: Array<{
        id: string
        type: 'multiple_choice' | 'multiple_answer' | 'true_false'
        question_text: string
        question_image_url: string
        question_image_alt: string
        explanation: string
        points: number
        order: number
        options: Array<{ id: string; option_text: string; is_correct: boolean; order: number }>
      }>
    }>
  }>
}

/**
 * Curso completo no formato do assistente. O chamador já decidiu quem pode ver (dono ou admin):
 * aqui só se carrega. Devolve `null` se o curso não existir.
 */
export async function loadCourseForEdit(
  db: DbExecutor,
  courseId: number,
): Promise<(CourseEditData & { _status: string; _producerId: string }) | null> {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId))
  if (!course) return null

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId))
    .orderBy(asc(courseModules.displayOrder), asc(courseModules.id))
  const moduleIds = modules.map((module) => module.id)

  const lessons =
    moduleIds.length > 0
      ? await db
          .select()
          .from(courseLessons)
          .where(inArray(courseLessons.moduleId, moduleIds))
          .orderBy(asc(courseLessons.displayOrder), asc(courseLessons.id))
      : []
  const quizLessonIds = lessons
    .filter((lesson) => lesson.type === 'quiz')
    .map((lesson) => lesson.id)

  const settingsRows =
    quizLessonIds.length > 0
      ? await db.select().from(quizSettings).where(inArray(quizSettings.lessonId, quizLessonIds))
      : []
  const questionRows =
    quizLessonIds.length > 0
      ? await db
          .select()
          .from(quizQuestions)
          .where(inArray(quizQuestions.lessonId, quizLessonIds))
          .orderBy(asc(quizQuestions.displayOrder), asc(quizQuestions.id))
      : []
  const questionIds = questionRows.map((question) => question.id)
  const optionRows =
    questionIds.length > 0
      ? await db
          .select()
          .from(quizOptions)
          .where(inArray(quizOptions.questionId, questionIds))
          .orderBy(asc(quizOptions.displayOrder), asc(quizOptions.id))
      : []

  const settingsByLesson = new Map(settingsRows.map((row) => [row.lessonId, row]))
  const optionsByQuestion = new Map<number, typeof optionRows>()
  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? []
    list.push(option)
    optionsByQuestion.set(option.questionId, list)
  }
  const questionsByLesson = new Map<number, typeof questionRows>()
  for (const question of questionRows) {
    const list = questionsByLesson.get(question.lessonId) ?? []
    list.push(question)
    questionsByLesson.set(question.lessonId, list)
  }
  const lessonsByModule = new Map<number, typeof lessons>()
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.moduleId) ?? []
    list.push(lesson)
    lessonsByModule.set(lesson.moduleId, list)
  }

  return {
    _status: course.status,
    _producerId: course.producerId,
    title: course.title,
    slug: course.slug,
    short_description: course.shortDescription ?? '',
    description: course.description,
    category_id: String(course.categoryId),
    level: course.level,
    thumbnail_url: course.thumbnailUrl ?? '',
    cover_image_url: course.coverImageUrl ?? '',
    trailer_url: course.trailerUrl ?? '',
    what_you_will_learn: course.whatYouWillLearn ?? [],
    requirements: course.requirements ?? [],
    target_audience: course.targetAudience ?? [],
    price: course.price,
    is_free: course.price === 0,
    discount_price: course.discountPrice,
    has_lifetime_access: course.hasLifetimeAccess,
    has_certificate: course.hasCertificate,
    modules: modules.map((module) => ({
      id: `module-${module.id}`,
      title: module.title,
      description: module.description ?? '',
      order: module.displayOrder,
      lessons: (lessonsByModule.get(module.id) ?? []).map((lesson) => {
        const settings = settingsByLesson.get(lesson.id)
        return {
          id: `lesson-${lesson.id}`,
          title: lesson.title,
          description: lesson.description ?? '',
          type: lesson.type,
          duration_minutes: lesson.durationMinutes ?? 0,
          order: lesson.displayOrder,
          is_preview: lesson.isFreePreview,
          content_url: lesson.contentUrl ?? '',
          content_text: lesson.contentText ?? '',
          quiz_settings: settings
            ? {
                passing_score: settings.passingScore,
                time_limit_minutes: settings.timeLimitMinutes ?? undefined,
                allow_retake: settings.allowRetake,
                show_answers_after: settings.showAnswersAfter,
                shuffle_questions: settings.shuffleQuestions,
                shuffle_options: settings.shuffleOptions,
              }
            : undefined,
          quiz_questions: (questionsByLesson.get(lesson.id) ?? []).map((question) => ({
            id: String(question.id),
            type: question.type,
            question_text: question.questionText,
            question_image_url: question.questionImageUrl ?? '',
            question_image_alt: question.questionImageAlt ?? '',
            explanation: question.explanation ?? '',
            points: question.points,
            order: question.displayOrder,
            options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
              id: String(option.id),
              option_text: option.optionText,
              is_correct: option.isCorrect,
              order: option.displayOrder,
            })),
          })),
        }
      }),
    })),
  }
}
