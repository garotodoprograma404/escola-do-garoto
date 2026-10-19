import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { courseLessons, courseModules, enrollments } from '../../database/schema/index.js'

/** Matrículas que dão acesso ao conteúdo (ativa ou concluída). */
export const ACCESS_STATUSES = ['active', 'completed'] as const

export type LessonContext = {
  lessonId: number
  moduleId: number
  courseId: number
  type: 'video' | 'text' | 'quiz' | 'file'
  isFreePreview: boolean
}

export type EnrollmentAccess = {
  id: number
  status: 'active' | 'completed'
}

/**
 * Perguntas de acesso do aluno ("estou matriculado?", "esta aula é deste curso e está publicada?").
 * Tudo filtra pelo `userId` da SESSÃO: nunca por id vindo do corpo/consulta.
 *
 * Protege as tabelas `lesson_progress`, `lesson_notes`, `course_questions`, `quiz_attempts` e
 * `course_reviews`: só quem tem matrícula ativa ou concluída acessa.
 */
@Injectable()
export class LearningAccessService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Matrícula ativa/concluída do aluno no curso, ou `undefined`. Com `lock`, trava a linha até o
   * fim da transação (serializa progresso/tentativas do mesmo aluno no mesmo curso).
   */
  async findEnrollment(
    userId: string,
    courseId: number,
    executor: DbExecutor = this.db,
    options: { lock?: boolean } = {},
  ): Promise<EnrollmentAccess | undefined> {
    const query = executor
      .select({ id: enrollments.id, status: enrollments.status })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId, courseId),
          inArray(enrollments.status, [...ACCESS_STATUSES]),
        ),
      )
      .limit(1)
    const [row] = options.lock ? await query.for('update') : await query
    return row as EnrollmentAccess | undefined
  }

  async requireEnrollment(
    userId: string,
    courseId: number,
    executor: DbExecutor = this.db,
    options: { lock?: boolean } = {},
  ): Promise<EnrollmentAccess> {
    const enrollment = await this.findEnrollment(userId, courseId, executor, options)
    if (!enrollment) throw new ForbiddenException('Você não está matriculado neste curso')
    return enrollment
  }

  /**
   * Aula PUBLICADA (e módulo publicado) com o curso a que pertence. Aula/módulo em rascunho
   * "não existem" para o aluno.
   */
  async findPublishedLesson(
    lessonId: number,
    executor: DbExecutor = this.db,
  ): Promise<LessonContext | undefined> {
    const [row] = await executor
      .select({
        lessonId: courseLessons.id,
        moduleId: courseLessons.moduleId,
        courseId: courseModules.courseId,
        type: courseLessons.type,
        isFreePreview: courseLessons.isFreePreview,
      })
      .from(courseLessons)
      .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.isPublished, true),
          eq(courseModules.isPublished, true),
        ),
      )
      .limit(1)
    return row
  }

  async requirePublishedLesson(
    lessonId: number,
    executor: DbExecutor = this.db,
  ): Promise<LessonContext> {
    const lesson = await this.findPublishedLesson(lessonId, executor)
    if (!lesson) throw new NotFoundException('Aula não encontrada')
    return lesson
  }

  /** Aula publicada + matrícula do aluno no curso dela. Base de progresso, quiz, nota e pergunta. */
  async requireEnrolledLesson(
    userId: string,
    lessonId: number,
    executor: DbExecutor = this.db,
    options: { lock?: boolean } = {},
  ): Promise<{ lesson: LessonContext; enrollment: EnrollmentAccess }> {
    const lesson = await this.requirePublishedLesson(lessonId, executor)
    const enrollment = await this.requireEnrollment(userId, lesson.courseId, executor, options)
    return { lesson, enrollment }
  }

  /** Igual ao anterior, mas o front também informa o curso: precisa bater com o da aula. */
  async requireEnrolledLessonInCourse(
    userId: string,
    courseId: number,
    lessonId: number,
    executor: DbExecutor = this.db,
  ): Promise<{ lesson: LessonContext; enrollment: EnrollmentAccess }> {
    const enrollment = await this.requireEnrollment(userId, courseId, executor)
    const lesson = await this.requirePublishedLesson(lessonId, executor)
    if (lesson.courseId !== courseId) {
      // 404 (e não 403) para não revelar a existência de aulas de outros cursos.
      throw new NotFoundException('A aula não pertence ao curso informado')
    }
    return { lesson, enrollment }
  }
}
