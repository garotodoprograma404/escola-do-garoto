import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import {
  categories,
  courseAudits,
  courseLessons,
  courseModules,
  courses,
  enrollments,
  profiles,
  quizOptions,
  quizQuestions,
  quizSettings,
  transactions,
} from '../../database/schema/index.js'
import { courseDataFromComplete, courseDataFromDraft } from './course-data.js'
import {
  insertCourseRow,
  loadCourseForEdit,
  recalculateCourseTotals,
  rethrowCourseWriteError,
  setCurriculumPublished,
  syncCurriculum,
  type CourseEditData,
} from './course-graph.js'
import {
  fromCents,
  toCents,
  type CompleteCourseInput,
  type ProducerCoursesQuery,
} from './course-input.schemas.js'
import { htmlToPlainText } from './html-sanitizer.js'
import { normalizeFileLessonUrl, normalizeVideoLessonUrl } from './lesson-url.js'

/** Escapa `\ % _` para uso em LIKE, depois de normalizar (letras de largura total viram `%`). */
export function escapeLike(value: string): string {
  return value.normalize('NFKC').replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** Tipos de questão com alternativas (precisam de pelo menos 2, e 1 correta). */
const OBJECTIVE_QUESTION_TYPES = new Set(['multiple_choice', 'multiple_answer', 'true_false'])

type ProducerCourseListItem = {
  id: number
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  price: number
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
  created_at: Date
  updated_at: Date
  published_at: Date | null
  total_students: number
  total_revenue: number
  average_rating: number
  total_reviews: number
  /** Recado da última decisão do admin (rejeição ou pedido de alterações) enquanto vale. */
  review_feedback: string | null
}

@Injectable()
export class ProducerCoursesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Categorias ativas para o seletor do assistente (produtor e admin). */
  listActiveCategories() {
    return this.db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder), asc(categories.name))
  }

  /** Comissão da plataforma do produtor logado (o assistente mostra o quanto ele recebe). */
  async getCommissionRate(user: SessionUser): Promise<{ commission_rate: number | null }> {
    const [row] = await this.db
      .select({ commissionRate: profiles.commissionRate })
      .from(profiles)
      .where(eq(profiles.id, user.id))
    return { commission_rate: row?.commissionRate ?? null }
  }

  /** Receita por curso: vendas concluídas (`transactions` tipo `sale`), somadas em centavos. */
  private async revenueByCourse(courseIds: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>()
    if (courseIds.length === 0) return result
    const rows = await this.db
      .select({
        courseId: transactions.courseId,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.courseId, courseIds),
          eq(transactions.status, 'completed'),
          eq(transactions.type, 'sale'),
        ),
      )
      .groupBy(transactions.courseId)
    for (const row of rows) {
      if (row.courseId !== null) result.set(row.courseId, toCents(Number(row.total)))
    }
    return result
  }

  async listCourses(
    user: SessionUser,
    query: ProducerCoursesQuery,
  ): Promise<ProducerCourseListItem[]> {
    const filters: SQL[] = [eq(courses.producerId, user.id)]
    if (query.search) filters.push(ilike(courses.title, `%${escapeLike(query.search)}%`))
    if (query.status) filters.push(eq(courses.status, query.status))

    const direction = query.sortOrder === 'asc' ? asc : desc
    const sortColumn =
      query.sortBy === 'title'
        ? courses.title
        : query.sortBy === 'students'
          ? courses.totalStudents
          : courses.createdAt

    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        thumbnail_url: courses.thumbnailUrl,
        price: courses.price,
        status: courses.status,
        created_at: courses.createdAt,
        updated_at: courses.updatedAt,
        published_at: courses.publishedAt,
        total_students: courses.totalStudents,
        average_rating: courses.averageRating,
        total_reviews: courses.totalReviews,
      })
      .from(courses)
      .where(and(...filters))
      .orderBy(direction(sortColumn), desc(courses.id))

    const ids = rows.map((row) => row.id)
    const revenue = await this.revenueByCourse(ids)
    const feedback = await this.pendingFeedbackByCourse(rows)
    const items = rows.map((row) => ({
      ...row,
      average_rating: row.average_rating ?? 0,
      total_revenue: fromCents(revenue.get(row.id) ?? 0),
      review_feedback: feedback.get(row.id) ?? null,
    }))

    if (query.sortBy === 'revenue') {
      items.sort((a, b) =>
        query.sortOrder === 'asc'
          ? a.total_revenue - b.total_revenue
          : b.total_revenue - a.total_revenue,
      )
    }
    return items
  }

  /**
   * Recado do admin para cursos que voltaram ao produtor (rejeitados ou em rascunho por pedido de
   * alterações): o que ele precisa corrigir antes de reenviar.
   */
  private async pendingFeedbackByCourse(
    rows: { id: number; status: string }[],
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>()
    const ids = rows
      .filter((row) => row.status === 'rejected' || row.status === 'draft')
      .map((row) => row.id)
    if (ids.length === 0) return result
    const audits = await this.db
      .select({
        courseId: courseAudits.courseId,
        decision: courseAudits.decision,
        feedback: courseAudits.feedback,
      })
      .from(courseAudits)
      .where(inArray(courseAudits.courseId, ids))
      .orderBy(desc(courseAudits.createdAt), desc(courseAudits.id))
    const status = new Map(rows.map((row) => [row.id, row.status]))
    const seen = new Set<number>()
    for (const audit of audits) {
      // A decisão mais recente é a que vale.
      if (seen.has(audit.courseId)) continue
      seen.add(audit.courseId)
      const wanted = status.get(audit.courseId) === 'rejected' ? 'rejected' : 'changes_requested'
      if (audit.decision === wanted && audit.feedback) result.set(audit.courseId, audit.feedback)
    }
    return result
  }

  async getCourse(user: SessionUser, courseId: number) {
    const [course] = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        short_description: courses.shortDescription,
        thumbnail_url: courses.thumbnailUrl,
        cover_image_url: courses.coverImageUrl,
        trailer_url: courses.trailerUrl,
        category_id: courses.categoryId,
        level: courses.level,
        price: courses.price,
        discount_price: courses.discountPrice,
        status: courses.status,
        is_published: courses.isPublished,
        published_at: courses.publishedAt,
        total_students: courses.totalStudents,
        total_lessons: courses.totalLessons,
        total_duration_minutes: courses.totalDurationMinutes,
        average_rating: courses.averageRating,
        total_reviews: courses.totalReviews,
        created_at: courses.createdAt,
        updated_at: courses.updatedAt,
      })
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.producerId, user.id)))
    if (!course) throw new NotFoundException('Curso não encontrado')

    const revenue = await this.revenueByCourse([course.id])
    return {
      ...course,
      average_rating: course.average_rating ?? 0,
      total_revenue: fromCents(revenue.get(course.id) ?? 0),
    }
  }

  /** Curso completo para o assistente de edição. Só o dono (nunca por id de outro produtor). */
  async getCourseForEdit(user: SessionUser, courseId: number): Promise<CourseEditData> {
    const course = await loadCourseForEdit(this.db, courseId)
    if (!course || course._producerId !== user.id) {
      throw new NotFoundException('Curso não encontrado ou sem permissão')
    }
    const { _status: _s, _producerId: _p, ...data } = course
    return data
  }

  /** Cria o curso inteiro (curso + módulos + aulas + quiz) em UMA transação, já em revisão. */
  async createCourse(user: SessionUser, input: CompleteCourseInput): Promise<{ courseId: number }> {
    const data = courseDataFromComplete(input, this.env.WEB_ORIGIN)
    try {
      const courseId = await this.db.transaction(async (tx) => {
        const created = await insertCourseRow(
          tx,
          { ...data, categoryId: data.categoryId! },
          { producerId: user.id, status: 'pending_review' },
        )
        await syncCurriculum(tx, created.id, data.modules)
        await recalculateCourseTotals(tx, created.id)
        return created.id
      })
      return { courseId }
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  /** Rascunho: aceita o que o assistente tiver preenchido; só o dono, sempre `draft`. */
  async saveDraft(user: SessionUser, rawInput: unknown): Promise<{ courseId: number }> {
    const data = courseDataFromDraft(rawInput, this.env.WEB_ORIGIN)
    try {
      const courseId = await this.db.transaction(async (tx) => {
        const categoryId = data.categoryId ?? (await this.firstActiveCategoryId(tx))
        if (!categoryId) {
          throw new BadRequestException('Nenhuma categoria ativa encontrada para salvar rascunho')
        }
        const slug = await this.freeSlug(tx, data.slug)
        const created = await insertCourseRow(
          tx,
          { ...data, slug, categoryId },
          { producerId: user.id, status: 'draft' },
        )
        await syncCurriculum(tx, created.id, data.modules)
        await recalculateCourseTotals(tx, created.id)
        return created.id
      })
      return { courseId }
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  async firstActiveCategoryId(executor: Pick<Database, 'select'>): Promise<number | null> {
    const [row] = await executor
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder), asc(categories.id))
      .limit(1)
    return row?.id ?? null
  }

  /** Slug de rascunho: se estiver ocupado, acrescenta um sufixo. */
  async freeSlug(executor: Pick<Database, 'select'>, base: string): Promise<string> {
    const stamp = Date.now()
    const candidates = [base, `${base}-${stamp}-1`, `${base}-${stamp}-2`, `${base}-${stamp}-3`]
    const taken = await executor
      .select({ slug: courses.slug })
      .from(courses)
      .where(inArray(courses.slug, candidates))
    const used = new Set(taken.map((row) => row.slug))
    const free = candidates.find((candidate) => !used.has(candidate))
    if (!free)
      throw new ConflictException('Este slug já está em uso. Escolha outra URL para o curso.')
    return free
  }

  /**
   * Atualiza um curso do próprio produtor. Arquivado não edita. Curso aprovado volta para revisão
   * e sai do ar. Curso com preço travado pelo admin não muda de preço.
   */
  async updateCourse(
    user: SessionUser,
    courseId: number,
    input: CompleteCourseInput,
    options: { skipCurriculumUpdate?: boolean } = {},
  ): Promise<void> {
    const data = courseDataFromComplete(input, this.env.WEB_ORIGIN)
    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            status: courses.status,
            price: courses.price,
            discountPrice: courses.discountPrice,
            priceLocked: courses.priceLockedByAdmin,
          })
          .from(courses)
          .where(and(eq(courses.id, courseId), eq(courses.producerId, user.id)))
          .for('update')
        if (!current)
          throw new NotFoundException('Curso não encontrado ou sem permissão para editar.')
        if (current.status === 'archived') {
          throw new ConflictException('Cursos arquivados não podem ser editados.')
        }

        if (current.priceLocked) {
          const samePrice = toCents(data.price) === toCents(current.price)
          const sameDiscount =
            (data.discountPrice === null ? null : toCents(data.discountPrice)) ===
            (current.discountPrice === null ? null : toCents(current.discountPrice))
          if (!samePrice || !sameDiscount) {
            throw new ForbiddenException(
              'O preço deste curso foi travado pela administração e não pode ser alterado.',
            )
          }
        }

        const returnToReview = current.status === 'approved'
        await tx
          .update(courses)
          .set({
            title: data.title,
            slug: data.slug,
            shortDescription: data.shortDescription,
            description: data.description,
            categoryId: data.categoryId!,
            level: data.level,
            thumbnailUrl: data.thumbnailUrl,
            coverImageUrl: data.coverImageUrl,
            trailerUrl: data.trailerUrl,
            price: data.price,
            discountPrice: data.discountPrice,
            hasLifetimeAccess: data.hasLifetimeAccess,
            hasCertificate: data.hasCertificate,
            whatYouWillLearn: data.whatYouWillLearn,
            requirements: data.requirements,
            targetAudience: data.targetAudience,
            ...(returnToReview
              ? { status: 'pending_review' as const, isPublished: false, publishedAt: null }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(courses.id, courseId))

        if (!options.skipCurriculumUpdate) {
          await syncCurriculum(tx, courseId, data.modules)
          await recalculateCourseTotals(tx, courseId)
        }
        if (returnToReview) await setCurriculumPublished(tx, courseId, false)
      })
    } catch (error) {
      return rethrowCourseWriteError(error)
    }
  }

  /** Envia para a fila do admin depois de conferir se o curso está completo. */
  async submitForReview(user: SessionUser, courseId: number): Promise<{ message: string }> {
    return this.db.transaction(async (tx) => {
      const [course] = await tx
        .select({ id: courses.id, status: courses.status })
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.producerId, user.id)))
        .for('update')
      if (!course) throw new NotFoundException('Curso não encontrado ou sem permissão.')

      if (course.status === 'pending_review') return { message: 'Este curso já está em revisão.' }
      if (course.status === 'archived') {
        throw new ConflictException('Cursos arquivados não podem ser enviados para revisão.')
      }
      if (course.status === 'approved') {
        throw new ConflictException('Este curso já foi aprovado.')
      }

      const modules = await tx
        .select({ id: courseModules.id })
        .from(courseModules)
        .where(eq(courseModules.courseId, courseId))
      if (modules.length === 0) {
        throw new BadRequestException('Adicione ao menos um módulo antes de enviar para revisão.')
      }

      const lessons = await tx
        .select({
          id: courseLessons.id,
          type: courseLessons.type,
          title: courseLessons.title,
          contentUrl: courseLessons.contentUrl,
          contentText: courseLessons.contentText,
        })
        .from(courseLessons)
        .where(
          inArray(
            courseLessons.moduleId,
            modules.map((module) => module.id),
          ),
        )
      if (lessons.length === 0) {
        throw new BadRequestException('Adicione ao menos uma aula antes de enviar para revisão.')
      }

      for (const lesson of lessons) {
        const url = lesson.contentUrl?.trim() ?? ''
        if ((lesson.type === 'video' || lesson.type === 'file') && !url) {
          throw new BadRequestException(`A aula "${lesson.title}" precisa de uma URL de conteúdo.`)
        }
        if (lesson.type === 'video' && url && !normalizeVideoLessonUrl(url)) {
          throw new BadRequestException(
            `A aula "${lesson.title}" possui URL de vídeo não suportada.`,
          )
        }
        if (lesson.type === 'file' && url && !normalizeFileLessonUrl(url)) {
          throw new BadRequestException(`A aula "${lesson.title}" possui URL de arquivo inválida.`)
        }
        if (lesson.type === 'text' && htmlToPlainText(lesson.contentText).length < 10) {
          throw new BadRequestException(
            `A aula "${lesson.title}" precisa de conteúdo em texto válido.`,
          )
        }
      }

      const quizLessonIds = lessons
        .filter((lesson) => lesson.type === 'quiz')
        .map((lesson) => lesson.id)
      if (quizLessonIds.length > 0) {
        const settings = await tx
          .select({ lessonId: quizSettings.lessonId })
          .from(quizSettings)
          .where(inArray(quizSettings.lessonId, quizLessonIds))
        const questions = await tx
          .select({
            id: quizQuestions.id,
            lessonId: quizQuestions.lessonId,
            type: quizQuestions.type,
          })
          .from(quizQuestions)
          .where(inArray(quizQuestions.lessonId, quizLessonIds))

        const withSettings = new Set(settings.map((row) => row.lessonId))
        const questionCount = new Map<number, number>()
        for (const question of questions) {
          questionCount.set(question.lessonId, (questionCount.get(question.lessonId) ?? 0) + 1)
        }
        for (const lessonId of quizLessonIds) {
          if (!withSettings.has(lessonId)) {
            throw new BadRequestException('Toda aula de quiz precisa de configurações definidas.')
          }
          if (!questionCount.get(lessonId)) {
            throw new BadRequestException('Toda aula de quiz precisa de ao menos uma questão.')
          }
        }

        const objectiveIds = questions
          .filter((question) => OBJECTIVE_QUESTION_TYPES.has(question.type))
          .map((question) => question.id)
        if (objectiveIds.length > 0) {
          const options = await tx
            .select({ questionId: quizOptions.questionId, isCorrect: quizOptions.isCorrect })
            .from(quizOptions)
            .where(inArray(quizOptions.questionId, objectiveIds))
          const stats = new Map<number, { total: number; correct: number }>()
          for (const option of options) {
            const current = stats.get(option.questionId) ?? { total: 0, correct: 0 }
            stats.set(option.questionId, {
              total: current.total + 1,
              correct: current.correct + (option.isCorrect ? 1 : 0),
            })
          }
          for (const questionId of objectiveIds) {
            const stat = stats.get(questionId)
            if (!stat || stat.total < 2 || stat.correct < 1) {
              throw new BadRequestException(
                'Questões objetivas precisam de alternativas válidas e ao menos uma correta.',
              )
            }
          }
        }
      }

      await tx
        .update(courses)
        .set({
          status: 'pending_review',
          isPublished: false,
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(courses.id, courseId))
      return { message: 'Curso enviado para revisão com sucesso.' }
    })
  }

  /**
   * Exclui o curso do próprio produtor. Curso com alunos matriculados não pode ser apagado
   * (apagar levaria junto as matrículas e o progresso de todos os alunos).
   */
  async deleteCourse(user: SessionUser, courseId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [course] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.producerId, user.id)))
        .for('update')
      if (!course) throw new NotFoundException('Curso não encontrado ou sem permissão para excluir')

      const [enrolled] = await tx
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(eq(enrollments.courseId, courseId))
        .limit(1)
      if (enrolled) {
        throw new ConflictException(
          'Este curso já tem alunos matriculados e não pode ser excluído. Fale com a administração para arquivá-lo.',
        )
      }

      try {
        await tx.delete(courses).where(eq(courses.id, courseId))
      } catch (error) {
        const code = error as { cause?: { code?: string }; code?: string }
        if ((code.cause?.code ?? code.code) === '23503') {
          // Ainda há vendas/certificados ligados a ele: não dá para apagar sem perder histórico.
          throw new ConflictException(
            'Este curso tem histórico (vendas ou certificados) e não pode ser excluído.',
          )
        }
        throw error
      }
    })
  }
}
