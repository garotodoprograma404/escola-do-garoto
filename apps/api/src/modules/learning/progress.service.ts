import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  courseLessons,
  courseModules,
  enrollments,
  lessonProgress,
  quizAttempts,
  quizSettings,
} from '../../database/schema/index.js'
import { CourseCompletionService, type CourseCompletedEvent } from './course-completion.service.js'
import { LearningActivityService, type LearningActivity } from './learning-activity.service.js'
import { LearningAccessService, type LessonContext } from './learning-access.service.js'
import { computeProgress } from './progress-calc.js'

export type CourseProgressSnapshot = ReturnType<typeof computeProgress>

export type ProgressResult = {
  success: true
  progressPercentage: number
  completedLessons: number
  courseCompleted: boolean
}

type ApplyOptions = { watchTimeSeconds?: number; complete: boolean }

type ApplyOutcome = {
  result: ProgressResult
  event: CourseCompletedEvent | undefined
  /** A aula passou a contar como concluída nesta chamada (para os avisos de atividade). */
  lessonCompletedNow: boolean
}

/**
 * Progresso do aluno. O PERCENTUAL e o STATUS da matrícula são sempre calculados aqui, a partir
 * de `lesson_progress`: o cliente só diz "assisti até X segundos" e "concluí esta aula".
 *
 * Defesas: o aluno não escreve direto em `enrollments` (senão forjaria 100%/concluído/certificado);
 * o progresso só é aceito se a aula pertence ao curso da matrícula; aula em rascunho não conta;
 * `last_accessed_at` é gravado aqui; quiz só é "concluído" com aprovação.
 */
@Injectable()
export class ProgressService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(LearningAccessService) private readonly access: LearningAccessService,
    @Inject(CourseCompletionService) private readonly completion: CourseCompletionService,
    @Inject(LearningActivityService) private readonly activity: LearningActivityService,
  ) {}

  /** Salva o tempo assistido; com `completed: true` também conclui a aula. */
  async saveProgress(
    userId: string,
    lessonId: number,
    input: { watchTimeSeconds: number; completed?: boolean },
  ): Promise<ProgressResult> {
    return this.run(userId, lessonId, {
      watchTimeSeconds: input.watchTimeSeconds,
      complete: input.completed === true,
    })
  }

  /** Marca a aula como concluída (botão "Marcar como concluído" e fim do vídeo). */
  async completeLesson(userId: string, lessonId: number): Promise<ProgressResult> {
    return this.run(userId, lessonId, { complete: true })
  }

  /**
   * Conclui a aula DENTRO de uma transação já aberta (usado pelo quiz ao aprovar). A matrícula
   * precisa estar travada pelo chamador. Devolve o evento de conclusão do curso (se houve) para
   * quem abriu a transação emitir depois do commit.
   */
  async completeLessonInTransaction(
    tx: DbExecutor,
    userId: string,
    lesson: LessonContext,
    enrollmentId: number,
  ): Promise<ApplyOutcome> {
    return this.apply(tx, userId, lesson, enrollmentId, { complete: true })
  }

  /**
   * Emite (fora de transação) os avisos do que aconteceu: atividades (aula concluída, quiz...) e,
   * por último, a conclusão do curso, se houve.
   */
  async publish(
    event: CourseCompletedEvent | undefined,
    activities: LearningActivity[] = [],
  ): Promise<void> {
    await this.activity.emit(...activities)
    if (event) await this.completion.emit(event)
  }

  /** Aviso de "aula concluída agora" para quem só tem o resultado de `apply`. */
  lessonActivity(userId: string, lesson: LessonContext, outcome: ApplyOutcome): LearningActivity[] {
    return outcome.lessonCompletedNow
      ? [{ type: 'lesson_completed', userId, courseId: lesson.courseId, lessonId: lesson.lessonId }]
      : []
  }

  /** Contagem de aulas publicadas × concluídas pelo aluno (era a função SQL `get_course_progress_snapshot`). */
  async getSnapshot(
    userId: string,
    courseId: number,
    executor: DbExecutor = this.db,
  ): Promise<CourseProgressSnapshot> {
    const [row] = await executor
      .select({
        total: sql<number>`count(${courseLessons.id})::int`,
        completed: sql<number>`count(${lessonProgress.id})::int`,
      })
      .from(courseModules)
      .innerJoin(courseLessons, eq(courseLessons.moduleId, courseModules.id))
      .leftJoin(
        lessonProgress,
        and(
          eq(lessonProgress.lessonId, courseLessons.id),
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, true),
        ),
      )
      .where(
        and(
          eq(courseModules.courseId, courseId),
          eq(courseModules.isPublished, true),
          eq(courseLessons.isPublished, true),
        ),
      )
    return computeProgress(row?.total ?? 0, row?.completed ?? 0)
  }

  /** Grava `last_accessed_at` (no máx. 1x por minuto por matrícula, para não escrever a cada clique). */
  async touchLastAccess(enrollmentId: number): Promise<void> {
    await this.db
      .update(enrollments)
      .set({ lastAccessedAt: new Date() })
      .where(
        and(
          eq(enrollments.id, enrollmentId),
          sql`(${enrollments.lastAccessedAt} is null or ${enrollments.lastAccessedAt} < now() - interval '1 minute')`,
        ),
      )
  }

  private async run(
    userId: string,
    lessonId: number,
    options: ApplyOptions,
  ): Promise<ProgressResult> {
    const { outcome, lesson } = await this.db.transaction(async (tx) => {
      // A matrícula fica travada até o fim: dois pedidos simultâneos não se atropelam.
      const { lesson, enrollment } = await this.access.requireEnrolledLesson(userId, lessonId, tx, {
        lock: true,
      })
      return { outcome: await this.apply(tx, userId, lesson, enrollment.id, options), lesson }
    })
    await this.publish(outcome.event, this.lessonActivity(userId, lesson, outcome))
    return outcome.result
  }

  private async apply(
    tx: DbExecutor,
    userId: string,
    lesson: LessonContext,
    enrollmentId: number,
    options: ApplyOptions,
  ): Promise<ApplyOutcome> {
    const now = new Date()

    const [enrollment] = await tx
      .select({
        status: enrollments.status,
        completedAt: enrollments.completedAt,
        certificateUrl: enrollments.certificateUrl,
        progressPercentage: enrollments.progressPercentage,
        completedLessons: enrollments.completedLessons,
      })
      .from(enrollments)
      .where(eq(enrollments.id, enrollmentId))
    if (!enrollment) throw new ForbiddenException('Você não está matriculado neste curso')

    const [existing] = await tx
      .select({ completed: lessonProgress.completed })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lesson.lessonId)))
    const wasCompleted = existing?.completed === true

    if (options.complete && !wasCompleted) {
      await this.assertQuizPassed(tx, userId, lesson)
    }

    // Upsert por (user_id, lesson_id). Concluída nunca "desconclui" e guarda a 1ª data de conclusão.
    await tx
      .insert(lessonProgress)
      .values({
        userId,
        lessonId: lesson.lessonId,
        watchTimeSeconds: options.watchTimeSeconds ?? 0,
        completed: options.complete,
        completedAt: options.complete ? now : null,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          ...(options.watchTimeSeconds !== undefined
            ? { watchTimeSeconds: options.watchTimeSeconds }
            : {}),
          ...(options.complete
            ? {
                completed: true,
                completedAt: sql`coalesce(${lessonProgress.completedAt}, ${now.toISOString()}::timestamptz)`,
              }
            : {}),
          updatedAt: now,
        },
      })

    // Só recalcula o curso quando a conclusão da aula pode ter mudado.
    if (!options.complete) {
      await tx
        .update(enrollments)
        .set({ lastAccessedAt: now })
        .where(eq(enrollments.id, enrollmentId))
      return {
        result: {
          success: true,
          progressPercentage: enrollment.progressPercentage,
          completedLessons: enrollment.completedLessons,
          courseCompleted: enrollment.status === 'completed',
        },
        event: undefined,
        lessonCompletedNow: false,
      }
    }

    const snapshot = await this.getSnapshot(userId, lesson.courseId, tx)
    const alreadyCompleted = enrollment.status === 'completed' || enrollment.completedAt !== null
    const isCompletedByProgress = snapshot.totalLessons > 0 && snapshot.progressPercentage >= 100

    const update: Partial<typeof enrollments.$inferInsert> = { lastAccessedAt: now }
    if (snapshot.totalLessons > 0) {
      update.progressPercentage = snapshot.progressPercentage
      update.completedLessons = snapshot.completedLessons
    }
    if (isCompletedByProgress) {
      update.status = 'completed'
      update.completedAt = enrollment.completedAt ?? now
    }
    await tx.update(enrollments).set(update).where(eq(enrollments.id, enrollmentId))

    let event: CourseCompletedEvent | undefined
    if (isCompletedByProgress) {
      const base = { enrollmentId, studentId: userId, courseId: lesson.courseId }
      if (!alreadyCompleted) {
        event = { ...base, reason: 'first_completion' }
      } else if (!wasCompleted && !enrollment.certificateUrl) {
        event = { ...base, reason: 'already_completed_without_certificate' }
      }
    }

    return {
      result: {
        success: true,
        progressPercentage:
          snapshot.totalLessons > 0 ? snapshot.progressPercentage : enrollment.progressPercentage,
        completedLessons:
          snapshot.totalLessons > 0 ? snapshot.completedLessons : enrollment.completedLessons,
        courseCompleted: isCompletedByProgress || enrollment.status === 'completed',
      },
      event,
      lessonCompletedNow: !wasCompleted,
    }
  }

  /**
   * Aula de quiz só conclui com aprovação (nota mínima de `quiz_settings.passing_score`). Quiz sem
   * configuração não tem como ser respondido, então não trava o aluno.
   */
  private async assertQuizPassed(tx: DbExecutor, userId: string, lesson: LessonContext) {
    if (lesson.type !== 'quiz') return
    const [settings] = await tx
      .select({ id: quizSettings.id })
      .from(quizSettings)
      .where(eq(quizSettings.lessonId, lesson.lessonId))
    if (!settings) return

    const [passed] = await tx
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, userId),
          eq(quizAttempts.lessonId, lesson.lessonId),
          eq(quizAttempts.passed, true),
        ),
      )
      .limit(1)
    if (!passed) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Para concluir este quiz é preciso ser aprovado.',
        code: 'quiz_not_passed',
      })
    }
  }
}
