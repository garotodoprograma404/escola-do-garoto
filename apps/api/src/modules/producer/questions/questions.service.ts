import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, isNotNull, isNull, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import {
  courseLessons,
  courseQuestions,
  courses,
  profiles,
} from '../../../database/schema/index.js'
import { NotificationsService } from '../../notifications/notifications.service.js'

export const QUESTION_FILTERS = ['all', 'pending', 'answered'] as const
export type QuestionFilter = (typeof QUESTION_FILTERS)[number]

type ProducerQuestion = {
  id: string
  courseId: string
  courseTitle: string
  lessonId?: string
  lessonTitle?: string
  studentId: string
  studentName: string
  studentAvatar?: string
  question: string
  answer?: string
  answeredBy?: string
  answeredAt?: Date
  isPublic: boolean
  upvotes: number
  createdAt: Date | null
  updatedAt: Date | null
}

export type ProducerQnA = {
  stats: { total: number; pending: number; answered: number; avgResponseTime: number }
  questions: ProducerQuestion[]
}

/** Teto de perguntas por resposta (a lista não é devolvida inteira). */
const MAX_QUESTIONS = 200

@Injectable()
export class QuestionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async getQuestions(
    producerId: string,
    filters: { courseId?: number; filter: QuestionFilter },
  ): Promise<ProducerQnA> {
    const where = and(
      // Só perguntas de cursos DO produtor da sessão.
      eq(courses.producerId, producerId),
      filters.courseId === undefined ? undefined : eq(courseQuestions.courseId, filters.courseId),
      this.filterCondition(filters.filter),
    )

    const [stats] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`(count(*) filter (where ${courseQuestions.answer} is null))::int`,
        answered: sql<number>`(count(*) filter (where ${courseQuestions.answer} is not null))::int`,
        avgHours: sql<
          string | null
        >`(avg(extract(epoch from (${courseQuestions.answeredAt} - ${courseQuestions.createdAt})) / 3600) filter (where ${courseQuestions.answer} is not null and ${courseQuestions.answeredAt} is not null))::text`,
      })
      .from(courseQuestions)
      .innerJoin(courses, eq(courses.id, courseQuestions.courseId))
      .where(where)

    const rows = await this.db
      .select({
        id: courseQuestions.id,
        courseId: courseQuestions.courseId,
        courseTitle: courses.title,
        lessonId: courseQuestions.lessonId,
        lessonTitle: courseLessons.title,
        studentId: courseQuestions.userId,
        studentName: profiles.fullName,
        studentAvatar: profiles.avatarUrl,
        question: courseQuestions.question,
        answer: courseQuestions.answer,
        answeredBy: courseQuestions.answeredBy,
        answeredAt: courseQuestions.answeredAt,
        isPublic: courseQuestions.isPublic,
        upvotes: courseQuestions.upvotes,
        createdAt: courseQuestions.createdAt,
        updatedAt: courseQuestions.updatedAt,
      })
      .from(courseQuestions)
      .innerJoin(courses, eq(courses.id, courseQuestions.courseId))
      .leftJoin(courseLessons, eq(courseLessons.id, courseQuestions.lessonId))
      .leftJoin(profiles, eq(profiles.id, courseQuestions.userId))
      .where(where)
      .orderBy(desc(courseQuestions.createdAt), desc(courseQuestions.id))
      .limit(MAX_QUESTIONS)

    return {
      stats: {
        total: stats?.total ?? 0,
        pending: stats?.pending ?? 0,
        answered: stats?.answered ?? 0,
        avgResponseTime: stats?.avgHours ? Number(stats.avgHours) : 0,
      },
      questions: rows.map((row) => ({
        id: row.id,
        courseId: String(row.courseId),
        courseTitle: row.courseTitle || 'Curso sem título',
        lessonId: row.lessonId === null ? undefined : String(row.lessonId),
        lessonTitle: row.lessonTitle ?? undefined,
        studentId: row.studentId,
        studentName: row.studentName || 'Aluno',
        studentAvatar: row.studentAvatar || undefined,
        question: row.question,
        answer: row.answer ?? undefined,
        answeredBy: row.answeredBy ?? undefined,
        answeredAt: row.answeredAt ?? undefined,
        isPublic: row.isPublic ?? true,
        upvotes: row.upvotes || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    }
  }

  /**
   * Responde uma pergunta de aluno em curso do produtor da sessão e avisa o aluno pelo sino.
   * Pergunta inexistente e pergunta de outro produtor dão o MESMO 404.
   */
  async answerQuestion(producerId: string, questionId: string, answer: string) {
    return this.db.transaction(async (tx) => {
      const [question] = await tx
        .select({
          id: courseQuestions.id,
          studentId: courseQuestions.userId,
          courseId: courseQuestions.courseId,
          courseTitle: courses.title,
          alreadyAnswered: isNotNull(courseQuestions.answer),
        })
        .from(courseQuestions)
        .innerJoin(courses, eq(courses.id, courseQuestions.courseId))
        .where(and(eq(courseQuestions.id, questionId), eq(courses.producerId, producerId)))
        .for('update', { of: courseQuestions })
      if (!question) throw new NotFoundException('Pergunta não encontrada')

      const now = new Date()
      const [updated] = await tx
        .update(courseQuestions)
        .set({ answer, answeredBy: producerId, answeredAt: now, updatedAt: now })
        .where(eq(courseQuestions.id, questionId))
        .returning({
          id: courseQuestions.id,
          answer: courseQuestions.answer,
          answeredAt: courseQuestions.answeredAt,
        })

      // Só a primeira resposta avisa o aluno (editar a resposta não manda outro aviso).
      if (!question.alreadyAnswered) {
        await this.notifications.create(
          {
            userId: question.studentId,
            type: 'question_answered',
            title: 'Sua pergunta foi respondida',
            message: `O instrutor respondeu sua pergunta no curso "${question.courseTitle}".`,
            link: '/student/questions',
            metadata: { question_id: question.id, course_id: question.courseId },
          },
          tx,
        )
      }
      return updated
    })
  }

  private filterCondition(filter: QuestionFilter): SQL | undefined {
    if (filter === 'pending') return isNull(courseQuestions.answer)
    if (filter === 'answered') return isNotNull(courseQuestions.answer)
    return undefined
  }
}
