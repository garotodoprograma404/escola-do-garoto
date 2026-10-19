import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { LearningActivityService } from './learning-activity.service.js'
import { courseLessons, courseQuestions, courses, profiles } from '../../database/schema/index.js'
import { LearningAccessService } from './learning-access.service.js'
import type {
  AskQuestionInput,
  LessonQuestionsQuery,
  ListQuestionsQuery,
  UpdateQuestionInput,
} from './learning.schemas.js'
import { toContainsPattern } from './like.js'

@Injectable()
export class QuestionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(LearningAccessService) private readonly access: LearningAccessService,
    @Inject(LearningActivityService) private readonly activity: LearningActivityService,
  ) {}

  /**
   * Perguntas e respostas da aula (e as gerais do curso), para quem está matriculado: as próprias
   * e as marcadas como públicas.
   */
  async listLessonQuestions(
    userId: string,
    courseId: number,
    lessonId: number,
    query: LessonQuestionsQuery,
  ) {
    await this.access.requireEnrolledLessonInCourse(userId, courseId, lessonId)

    const rows = await this.db
      .select({
        id: courseQuestions.id,
        lessonId: courseQuestions.lessonId,
        userId: courseQuestions.userId,
        question: courseQuestions.question,
        answer: courseQuestions.answer,
        isPublic: courseQuestions.isPublic,
        createdAt: courseQuestions.createdAt,
        answeredAt: courseQuestions.answeredAt,
      })
      .from(courseQuestions)
      .where(
        and(
          eq(courseQuestions.courseId, courseId),
          or(eq(courseQuestions.lessonId, lessonId), isNull(courseQuestions.lessonId)),
          or(eq(courseQuestions.userId, userId), eq(courseQuestions.isPublic, true)),
        ),
      )
      .orderBy(desc(courseQuestions.createdAt), desc(courseQuestions.id))
      .limit(query.limit + 1)
      .offset(query.offset)

    const hasMore = rows.length > query.limit
    const page = rows.slice(0, query.limit)

    const authorIds = [...new Set(page.map((row) => row.userId))]
    const authors = authorIds.length
      ? await this.db
          .select({ id: profiles.id, fullName: profiles.fullName })
          .from(profiles)
          .where(inArray(profiles.id, authorIds))
      : []
    const authorName = new Map(authors.map((author) => [author.id, author.fullName]))

    return {
      questions: page.map((row) => ({
        id: row.id,
        lessonId: row.lessonId,
        question: row.question,
        answer: row.answer,
        isPublic: row.isPublic ?? true,
        isMine: row.userId === userId,
        authorName: authorName.get(row.userId) || 'Aluno',
        createdAt: row.createdAt ?? new Date(),
        answeredAt: row.answeredAt,
      })),
      hasMore,
      nextOffset: query.offset + page.length,
    }
  }

  async askQuestion(userId: string, input: AskQuestionInput): Promise<{ id: string }> {
    await this.access.requireEnrolledLessonInCourse(userId, input.courseId, input.lessonId)
    const [created] = await this.db
      .insert(courseQuestions)
      .values({
        courseId: input.courseId,
        lessonId: input.lessonId,
        userId,
        question: input.question,
        isPublic: input.isPublic,
      })
      .returning({ id: courseQuestions.id })
    await this.activity.emit({
      type: 'question_asked',
      userId,
      courseId: input.courseId,
      questionId: created!.id,
    })
    return { id: created!.id }
  }

  /** Aluno só edita a própria pergunta enquanto ela não foi respondida. */
  async updateQuestion(userId: string, questionId: string, input: UpdateQuestionInput) {
    await this.requireOwnUnanswered(userId, questionId)
    await this.db
      .update(courseQuestions)
      .set({
        question: input.question,
        ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(courseQuestions.id, questionId),
          eq(courseQuestions.userId, userId),
          isNull(courseQuestions.answer),
        ),
      )
  }

  /** Aluno só apaga a própria pergunta ainda sem resposta. */
  async deleteQuestion(userId: string, questionId: string) {
    await this.requireOwnUnanswered(userId, questionId)
    await this.db
      .delete(courseQuestions)
      .where(
        and(
          eq(courseQuestions.id, questionId),
          eq(courseQuestions.userId, userId),
          isNull(courseQuestions.answer),
        ),
      )
  }

  private async requireOwnUnanswered(userId: string, questionId: string) {
    const [row] = await this.db
      .select({ answer: courseQuestions.answer })
      .from(courseQuestions)
      .where(and(eq(courseQuestions.id, questionId), eq(courseQuestions.userId, userId)))
    if (!row) throw new NotFoundException('Pergunta não encontrada')
    if (row.answer !== null) {
      throw new ConflictException('Pergunta já respondida não pode ser alterada nem apagada')
    }
  }

  /** "Minhas perguntas": só as do próprio aluno, com filtros, paginação e totais. */
  async listMyQuestions(userId: string, query: ListQuestionsQuery) {
    const conditions: (SQL | undefined)[] = [eq(courseQuestions.userId, userId)]
    if (query.course) conditions.push(eq(courseQuestions.courseId, query.course))
    if (query.status === 'pending') conditions.push(isNull(courseQuestions.answer))
    if (query.status === 'answered') conditions.push(isNotNull(courseQuestions.answer))
    if (query.search) {
      const pattern = toContainsPattern(query.search)
      conditions.push(
        or(ilike(courseQuestions.question, pattern), ilike(courseQuestions.answer, pattern)),
      )
    }
    const where = and(...conditions)

    const [filtered] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(courseQuestions)
      .where(where)
    const total = filtered?.total ?? 0

    const rows = await this.db
      .select({
        id: courseQuestions.id,
        courseId: sql<string>`${courseQuestions.courseId}::text`,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        lessonId: sql<string | null>`${courseQuestions.lessonId}::text`,
        lessonTitle: courseLessons.title,
        question: courseQuestions.question,
        answer: courseQuestions.answer,
        isPublic: courseQuestions.isPublic,
        createdAt: courseQuestions.createdAt,
        answeredAt: courseQuestions.answeredAt,
      })
      .from(courseQuestions)
      .innerJoin(courses, eq(courses.id, courseQuestions.courseId))
      .leftJoin(courseLessons, eq(courseLessons.id, courseQuestions.lessonId))
      .where(where)
      .orderBy(desc(courseQuestions.createdAt), desc(courseQuestions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)

    const [stats] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        answered: sql<number>`count(*) filter (where ${courseQuestions.answer} is not null)::int`,
        pending: sql<number>`count(*) filter (where ${courseQuestions.answer} is null)::int`,
        public: sql<number>`count(*) filter (where ${courseQuestions.isPublic} = true)::int`,
      })
      .from(courseQuestions)
      .where(eq(courseQuestions.userId, userId))

    return {
      questions: rows.map((row) => ({
        ...row,
        courseTitle: row.courseTitle || 'Curso',
        lessonTitle: row.lessonTitle ?? null,
        isPublic: row.isPublic ?? true,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      stats: {
        total: stats?.total ?? 0,
        answered: stats?.answered ?? 0,
        pending: stats?.pending ?? 0,
        public: stats?.public ?? 0,
      },
    }
  }

  async listMyQuestionCourses(userId: string) {
    return this.db
      .selectDistinctOn([courseQuestions.courseId], {
        id: sql<string>`${courseQuestions.courseId}::text`,
        title: courses.title,
        slug: courses.slug,
      })
      .from(courseQuestions)
      .innerJoin(courses, eq(courses.id, courseQuestions.courseId))
      .where(eq(courseQuestions.userId, userId))
      .orderBy(courseQuestions.courseId)
  }
}
