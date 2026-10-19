import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  courses,
  enrollments,
  profiles,
  userBadges,
  userGamification,
  xpEvents,
} from '../../database/schema/index.js'
import type { CourseCompletedEvent } from '../learning/course-completion.service.js'
import type { LearningActivity } from '../learning/learning-activity.service.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import {
  BADGES,
  QUESTIONS_WITH_XP_PER_DAY,
  XP,
  brazilDate,
  brazilMonthStart,
  levelFor,
  liveStreak,
  newlyEarnedBadges,
  nextStreak,
  rankingName,
  type LearnerStats,
  type XpSource,
} from './gamification.rules.js'

type Award = { source: XpSource; key: string; points: number; courseId: number | null }

const RANKING_SIZE = 10
const RECENT_EVENTS = 15
const ACHIEVEMENTS_LINK = '/student/conquistas'

/**
 * Gamificação do aluno: pontos (XP), nível, sequência de dias, medalhas e ranking do mês por curso.
 *
 * Os pontos chegam pelos avisos do `learning` (`LearningActivityService` e
 * `CourseCompletionService`), depois do commit do que o aluno fez. Cada fato vira uma linha em
 * `xp_events` com chave única (usuário + origem + fato): repetir a aula, reenviar o quiz ou
 * reemitir o aviso nunca pontua de novo. Os totais em `user_gamification` são atualizados com a
 * linha travada, então duas ações ao mesmo tempo não se atropelam.
 */
@Injectable()
export class GamificationService {
  /** Relógio dos pontos. Só a demonstração (`seed-demo`) troca, para simular dias de estudo. */
  private clock: () => Date = () => new Date()

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  useClock(clock: () => Date): void {
    this.clock = clock
  }

  // ------------------------------------------------------------------ pontuação

  async handleActivity(activity: LearningActivity, now = this.clock()): Promise<void> {
    const { userId, courseId } = activity
    switch (activity.type) {
      case 'lesson_completed':
        return this.award(
          userId,
          [
            {
              source: 'lesson_completed',
              key: String(activity.lessonId),
              points: XP.lessonCompleted,
              courseId,
            },
          ],
          { studyDay: true, now },
        )
      case 'quiz_passed':
        return this.award(
          userId,
          [
            {
              source: 'quiz_passed',
              key: String(activity.lessonId),
              points: XP.quizPassed,
              courseId,
            },
            ...(activity.perfect
              ? [
                  {
                    source: 'quiz_perfect' as const,
                    key: String(activity.lessonId),
                    points: XP.quizPerfect,
                    courseId,
                  },
                ]
              : []),
          ],
          { now },
        )
      case 'review_saved':
        return this.award(
          userId,
          [{ source: 'review', key: String(courseId), points: XP.review, courseId }],
          { now },
        )
      case 'question_asked':
        return this.award(
          userId,
          [{ source: 'question', key: activity.questionId, points: XP.question, courseId }],
          { now, questionCap: true },
        )
    }
  }

  async handleCourseCompleted(event: CourseCompletedEvent, now = this.clock()): Promise<void> {
    if (event.reason !== 'first_completion') return
    await this.award(
      event.studentId,
      [
        {
          source: 'course_completed',
          key: String(event.courseId),
          points: XP.courseCompleted,
          courseId: event.courseId,
        },
      ],
      { now },
    )
  }

  private async award(
    userId: string,
    awards: Award[],
    options: { now: Date; studyDay?: boolean; questionCap?: boolean },
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const state = await this.lockState(tx, userId)
      const today = brazilDate(options.now)

      let pending = awards
      if (
        options.questionCap &&
        (await this.questionsToday(tx, userId, options.now)) >= QUESTIONS_WITH_XP_PER_DAY
      ) {
        pending = []
      }

      let streakDays = state.streakDays
      let lastActivityDate = state.lastActivityDate
      if (options.studyDay) {
        const streak = nextStreak(state.lastActivityDate, state.streakDays, today)
        streakDays = streak.streakDays
        lastActivityDate = today
        if (streak.newDay && streak.streakDays >= 2) {
          pending = [
            ...pending,
            { source: 'streak_day', key: today, points: XP.streakDay, courseId: null },
          ]
        }
      }

      const gained = await this.insertEvents(tx, userId, pending, options.now)
      if (
        gained === 0 &&
        streakDays === state.streakDays &&
        lastActivityDate === state.lastActivityDate
      ) {
        return
      }

      const stats = await this.stats(tx, userId, streakDays)
      const xp = state.xp + gained
      const level = levelFor(xp)
      await tx
        .update(userGamification)
        .set({
          xp,
          level: level.level,
          streakDays,
          lastActivityDate,
          coursesCompleted: stats.coursesCompleted,
          updatedAt: options.now,
        })
        .where(eq(userGamification.userId, userId))

      if (level.level > state.level) {
        await this.notifications.create(
          {
            userId,
            type: 'gamification_level',
            title: `Você subiu para o nível ${level.level}!`,
            message: `Agora você é ${level.name}. Continue assim!`,
            link: ACHIEVEMENTS_LINK,
          },
          tx,
        )
      }
      await this.grantBadges(tx, userId, stats, options.now)
    })
  }

  /** Garante a linha de totais e a trava até o fim da transação. */
  private async lockState(tx: DbExecutor, userId: string) {
    await tx
      .insert(userGamification)
      .values({ userId })
      .onConflictDoNothing({ target: userGamification.userId })
    const [row] = await tx
      .select({
        xp: userGamification.xp,
        level: userGamification.level,
        streakDays: userGamification.streakDays,
        lastActivityDate: userGamification.lastActivityDate,
      })
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
      .for('update')
    return row!
  }

  private async questionsToday(tx: DbExecutor, userId: string, now: Date): Promise<number> {
    const startOfDay = new Date(`${brazilDate(now)}T00:00:00-03:00`)
    const [row] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          eq(xpEvents.source, 'question'),
          gte(xpEvents.createdAt, startOfDay),
        ),
      )
    return row?.total ?? 0
  }

  /** Grava os eventos novos (os repetidos são ignorados pela chave única) e devolve o XP ganho. */
  private async insertEvents(
    tx: DbExecutor,
    userId: string,
    awards: Award[],
    now: Date,
  ): Promise<number> {
    if (awards.length === 0) return 0
    const inserted = await tx
      .insert(xpEvents)
      .values(
        awards.map((award) => ({
          userId,
          courseId: award.courseId,
          source: award.source,
          sourceKey: award.key,
          points: award.points,
          createdAt: now,
        })),
      )
      .onConflictDoNothing({ target: [xpEvents.userId, xpEvents.source, xpEvents.sourceKey] })
      .returning({ points: xpEvents.points })
    return inserted.reduce((sum, row) => sum + row.points, 0)
  }

  private async stats(tx: DbExecutor, userId: string, streakDays: number): Promise<LearnerStats> {
    const rows = await tx
      .select({ source: xpEvents.source, total: sql<number>`count(*)::int` })
      .from(xpEvents)
      .where(eq(xpEvents.userId, userId))
      .groupBy(xpEvents.source)
    const count = (source: XpSource) => rows.find((row) => row.source === source)?.total ?? 0
    return {
      lessonsCompleted: count('lesson_completed'),
      coursesCompleted: count('course_completed'),
      perfectQuizzes: count('quiz_perfect'),
      reviews: count('review'),
      questions: count('question'),
      streakDays,
    }
  }

  private async grantBadges(tx: DbExecutor, userId: string, stats: LearnerStats, now: Date) {
    const owned = await tx
      .select({ type: userBadges.badgeType })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
    const earned = newlyEarnedBadges(stats, new Set(owned.map((row) => row.type)))
    if (earned.length === 0) return
    const inserted = await tx
      .insert(userBadges)
      .values(
        earned.map((badge) => ({
          userId,
          badgeType: badge.type,
          badgeName: badge.name,
          badgeDescription: badge.description,
          earnedAt: now,
        })),
      )
      .onConflictDoNothing({ target: [userBadges.userId, userBadges.badgeType] })
      .returning({ type: userBadges.badgeType })
    for (const { type } of inserted) {
      const badge = earned.find((item) => item.type === type)!
      await this.notifications.create(
        {
          userId,
          type: 'gamification_badge',
          title: `Nova medalha: ${badge.name}`,
          message: badge.description,
          link: ACHIEVEMENTS_LINK,
        },
        tx,
      )
    }
  }

  // ------------------------------------------------------------------ leitura (aluno)

  /** Nível, XP, sequência, medalhas (ganhas e bloqueadas) e últimos pontos. */
  async getSummary(userId: string, now = new Date()) {
    const [state] = await this.db
      .select({
        xp: userGamification.xp,
        streakDays: userGamification.streakDays,
        lastActivityDate: userGamification.lastActivityDate,
        rankingOptOut: userGamification.rankingOptOut,
      })
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
    const owned = await this.db
      .select({ type: userBadges.badgeType, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
    const recent = await this.db
      .select({
        source: xpEvents.source,
        points: xpEvents.points,
        courseTitle: courses.title,
        createdAt: xpEvents.createdAt,
      })
      .from(xpEvents)
      .leftJoin(courses, eq(courses.id, xpEvents.courseId))
      .where(eq(xpEvents.userId, userId))
      .orderBy(desc(xpEvents.createdAt), desc(xpEvents.id))
      .limit(RECENT_EVENTS)

    const xp = state?.xp ?? 0
    const level = levelFor(xp)
    const earnedAt = new Map(owned.map((row) => [row.type, row.earnedAt]))
    return {
      xp,
      level: level.level,
      levelName: level.name,
      currentLevelXp: level.currentLevelXp,
      nextLevelXp: level.nextLevelXp,
      levelProgress: level.progressPercentage,
      streakDays: liveStreak(
        state?.lastActivityDate ?? null,
        state?.streakDays ?? 0,
        brazilDate(now),
      ),
      rankingVisible: !(state?.rankingOptOut ?? false),
      badges: BADGES.map((badge) => ({
        type: badge.type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: earnedAt.get(badge.type)?.toISOString() ?? null,
      })),
      recentEvents: recent.map((row) => ({
        source: row.source as XpSource,
        points: row.points,
        courseTitle: row.courseTitle,
        createdAt: row.createdAt.toISOString(),
      })),
    }
  }

  /** Top 10 do mês num curso (só primeiro nome + inicial) e a posição de quem pergunta. */
  async getCourseRanking(userId: string, courseId: number, now = new Date()) {
    const [enrollment] = await this.db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId, courseId),
          inArray(enrollments.status, ['active', 'completed']),
        ),
      )
      .limit(1)
    if (!enrollment) throw new ForbiddenException('Você não está matriculado neste curso')

    const monthStart = brazilMonthStart(now)
    const points = sql<number>`sum(${xpEvents.points})::int`
    const visible = or(
      isNull(userGamification.rankingOptOut),
      eq(userGamification.rankingOptOut, false),
    )
    const standings = this.db
      .select({
        userId: xpEvents.userId,
        points: points.as('points'),
        firstAt: sql`min(${xpEvents.createdAt})`.as('first_at'),
      })
      .from(xpEvents)
      .leftJoin(userGamification, eq(userGamification.userId, xpEvents.userId))
      .where(and(eq(xpEvents.courseId, courseId), gte(xpEvents.createdAt, monthStart), visible))
      .groupBy(xpEvents.userId)
      .as('standings')

    const top = await this.db
      .select({ userId: standings.userId, points: standings.points, fullName: profiles.fullName })
      .from(standings)
      .innerJoin(profiles, eq(profiles.id, standings.userId))
      .orderBy(desc(standings.points), standings.firstAt)
      .limit(RANKING_SIZE)

    const [mine] = await this.db
      .select({ points: standings.points })
      .from(standings)
      .where(eq(standings.userId, userId))
    const [ahead] = mine
      ? await this.db
          .select({ total: sql<number>`count(*)::int` })
          .from(standings)
          .where(sql`${standings.points} > ${mine.points}`)
      : []

    return {
      courseId,
      month: brazilDate(now).slice(0, 7),
      entries: top.map((row, index) => ({
        position: index + 1,
        name: rankingName(row.fullName),
        points: row.points,
        isMe: row.userId === userId,
      })),
      me: mine ? { points: mine.points, position: (ahead?.total ?? 0) + 1 } : null,
    }
  }

  async setRankingVisibility(userId: string, visible: boolean) {
    await this.db
      .insert(userGamification)
      .values({ userId, rankingOptOut: !visible })
      .onConflictDoUpdate({
        target: userGamification.userId,
        set: { rankingOptOut: !visible, updatedAt: new Date() },
      })
    return { rankingVisible: visible }
  }

  // ------------------------------------------------------------------ leitura (produtor)

  /** Engajamento dos alunos do produtor (todos os cursos dele ou um só). */
  async getProducerEngagement(producerId: string, courseId: number | undefined, now = new Date()) {
    const ownCourses = and(
      eq(courses.producerId, producerId),
      courseId ? eq(courses.id, courseId) : undefined,
    )
    const students = this.db
      .selectDistinct({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(and(ownCourses, inArray(enrollments.status, ['active', 'completed'])))
      .as('students')

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const [engagement] = await this.db
      .select({
        students: sql<number>`count(*)::int`,
        withStreak: sql<number>`count(*) filter (where ${userGamification.lastActivityDate} >= ${brazilDate(yesterday)})::int`,
        averageStreak: sql<number>`coalesce(round(avg(${userGamification.streakDays}) filter (where ${userGamification.lastActivityDate} >= ${brazilDate(yesterday)}), 1), 0)::float8`,
        withBadges: sql<number>`count(*) filter (where exists (select 1 from ${userBadges} where ${userBadges.userId} = ${students.studentId}))::int`,
      })
      .from(students)
      .leftJoin(userGamification, eq(userGamification.userId, students.studentId))

    const monthStart = brazilMonthStart(now)
    const [month] = await this.db
      .select({ xp: sql<number>`coalesce(sum(${xpEvents.points}), 0)::int` })
      .from(xpEvents)
      .innerJoin(courses, eq(courses.id, xpEvents.courseId))
      .where(and(ownCourses, gte(xpEvents.createdAt, monthStart)))

    return {
      students: engagement?.students ?? 0,
      studentsWithActiveStreak: engagement?.withStreak ?? 0,
      averageActiveStreak: engagement?.averageStreak ?? 0,
      studentsWithBadges: engagement?.withBadges ?? 0,
      xpThisMonth: month?.xp ?? 0,
    }
  }
}
