import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { brazilDate, levelFor, liveStreak } from '../gamification/gamification.rules.js'
import {
  categories,
  courseLessons,
  courseModules,
  courses,
  enrollments,
  lessonProgress,
  profiles,
  userBadges,
  userGamification,
} from '../../database/schema/index.js'
import { ACCESS_STATUSES } from '../learning/learning-access.service.js'
import { lessonWatchPercentage } from '../learning/progress-calc.js'

type LessonStats = { lessons: number; durationMinutes: number; watchedMinutes: number }

export type StudentCourse = {
  id: number
  slug: string
  title: string
  thumbnailUrl: string | null
  producerName: string
  producerAvatar: string | null
  categoryName: string
  level: 'beginner' | 'intermediate' | 'advanced'
  totalLessons: number
  totalDurationMinutes: number
  enrollmentId: number
  enrolledAt: Date
  lastAccessedAt: Date | null
  progressPercentage: number
  completedLessons: number
  completedAt: Date | null
  watchedDurationMinutes: number
  isCompleted: boolean
}

export type EnrolledCourse = {
  id: number
  title: string
  slug: string
  thumbnail: string | null
  producerName: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  totalDurationMinutes: number
  watchedDurationMinutes: number
  isCompleted: boolean
  enrolledAt: Date
}

/** Cada nível custa 1000 XP. */

/**
 * "Meus cursos" e painel do aluno: matrículas DELE (ativas/concluídas) com progresso. O progresso
 * vem da matrícula (calculado no servidor ao concluir aulas); aulas/módulos em rascunho não contam.
 */
@Injectable()
export class StudentCoursesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getMyCourses(userId: string): Promise<StudentCourse[]> {
    const rows = await this.db
      .select({
        enrollmentId: enrollments.id,
        enrolledAt: enrollments.createdAt,
        lastAccessedAt: enrollments.lastAccessedAt,
        completedAt: enrollments.completedAt,
        progressPercentage: enrollments.progressPercentage,
        completedLessons: enrollments.completedLessons,
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        thumbnailUrl: courses.thumbnailUrl,
        level: courses.level,
        totalLessons: courses.totalLessons,
        totalDurationMinutes: courses.totalDurationMinutes,
        categoryName: categories.name,
        producerName: profiles.fullName,
        producerAvatar: profiles.avatarUrl,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .where(
        and(eq(enrollments.studentId, userId), inArray(enrollments.status, [...ACCESS_STATUSES])),
      )
      .orderBy(sql`${enrollments.lastAccessedAt} desc nulls last`, desc(enrollments.createdAt))

    const stats = await this.loadLessonStats(
      userId,
      rows.map((row) => row.id),
    )

    return rows.map((row) => {
      const courseStats = stats.get(row.id)
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        thumbnailUrl: row.thumbnailUrl || null,
        producerName: row.producerName || 'Produtor',
        producerAvatar: row.producerAvatar,
        categoryName: row.categoryName || 'Sem categoria',
        level: row.level,
        totalLessons: Math.max(row.totalLessons, courseStats?.lessons ?? 0),
        totalDurationMinutes: Math.max(row.totalDurationMinutes, courseStats?.durationMinutes ?? 0),
        enrollmentId: row.enrollmentId,
        enrolledAt: row.enrolledAt,
        lastAccessedAt: row.lastAccessedAt,
        progressPercentage: row.progressPercentage,
        completedLessons: row.completedLessons,
        completedAt: row.completedAt,
        watchedDurationMinutes: courseStats?.watchedMinutes ?? 0,
        isCompleted: row.progressPercentage === 100 || row.completedAt !== null,
      }
    })
  }

  /** Painel completo: gamificação, "continuar assistindo", cursos e totais. */
  async getDashboard(userId: string) {
    const [gamification, continueWatching, courses] = await Promise.all([
      this.getGamification(userId),
      this.getContinueWatching(userId),
      this.getEnrolledCourses(userId),
    ])

    const completedCourses = courses.filter((course) => course.isCompleted).length
    return {
      gamification,
      continueWatching,
      courses,
      stats: {
        totalCourses: courses.length,
        inProgressCourses: courses.length - completedCourses,
        completedCourses,
        totalHoursWatched:
          courses.reduce((sum, course) => sum + course.watchedDurationMinutes, 0) / 60,
      },
    }
  }

  private async getGamification(userId: string) {
    const [row] = await this.db
      .select({
        level: userGamification.level,
        xp: userGamification.xp,
        streakDays: userGamification.streakDays,
        lastActivityDate: userGamification.lastActivityDate,
        totalWatchTimeMinutes: userGamification.totalWatchTimeMinutes,
        coursesCompleted: userGamification.coursesCompleted,
      })
      .from(userGamification)
      .where(eq(userGamification.userId, userId))

    const badges = await this.db
      .select({
        id: userBadges.id,
        badgeType: userBadges.badgeType,
        badgeName: userBadges.badgeName,
        badgeDescription: userBadges.badgeDescription,
        earnedAt: userBadges.earnedAt,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt))

    // Sem registro ainda = valores iniciais (o GET não grava). Regras em `gamification.rules.ts`.
    const level = levelFor(row?.xp ?? 0)
    return {
      level: level.level,
      xp: row?.xp ?? 0,
      xpToNextLevel: level.nextLevelXp,
      streakDays: liveStreak(
        row?.lastActivityDate ?? null,
        row?.streakDays ?? 0,
        brazilDate(new Date()),
      ),
      totalWatchTimeMinutes: row?.totalWatchTimeMinutes ?? 0,
      coursesCompleted: row?.coursesCompleted ?? 0,
      badges: badges.map((badge) => ({ ...badge, badgeDescription: badge.badgeDescription ?? '' })),
    }
  }

  /** Última aula iniciada e ainda não concluída, de um curso em que a pessoa segue matriculada. */
  private async getContinueWatching(userId: string) {
    const [row] = await this.db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseThumbnail: courses.thumbnailUrl,
        lessonId: courseLessons.id,
        lessonTitle: courseLessons.title,
        durationMinutes: courseLessons.durationMinutes,
        moduleTitle: courseModules.title,
        watchTimeSeconds: lessonProgress.watchTimeSeconds,
        lastWatchedAt: lessonProgress.updatedAt,
      })
      .from(lessonProgress)
      .innerJoin(courseLessons, eq(courseLessons.id, lessonProgress.lessonId))
      .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.courseId, courses.id),
          eq(enrollments.studentId, userId),
          inArray(enrollments.status, [...ACCESS_STATUSES]),
        ),
      )
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, false),
          eq(courseLessons.isPublished, true),
          eq(courseModules.isPublished, true),
        ),
      )
      .orderBy(desc(lessonProgress.updatedAt))
      .limit(1)
    if (!row) return null

    return {
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      courseThumbnail: row.courseThumbnail,
      lessonId: row.lessonId,
      lessonTitle: row.lessonTitle,
      moduleTitle: row.moduleTitle,
      progressPercentage: lessonWatchPercentage(row.watchTimeSeconds, row.durationMinutes),
      lastWatchedAt: row.lastWatchedAt,
    }
  }

  private async getEnrolledCourses(userId: string): Promise<EnrolledCourse[]> {
    const mine = await this.getMyCourses(userId)
    return mine
      .map((course) => ({
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnailUrl,
        producerName: course.producerName,
        progressPercentage: course.progressPercentage,
        completedLessons: course.completedLessons,
        totalLessons: course.totalLessons,
        totalDurationMinutes: course.totalDurationMinutes,
        watchedDurationMinutes: course.watchedDurationMinutes,
        isCompleted: course.progressPercentage >= 100,
        enrolledAt: course.enrolledAt,
      }))
      .sort((a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime())
  }

  /** Aulas, duração e minutos assistidos por curso (só módulos e aulas publicados). */
  private async loadLessonStats(userId: string, courseIds: number[]) {
    const result = new Map<number, LessonStats>()
    if (courseIds.length === 0) return result

    const rows = await this.db
      .select({
        courseId: courseModules.courseId,
        lessons: sql<number>`count(${courseLessons.id})::int`,
        durationMinutes: sql<number>`coalesce(sum(${courseLessons.durationMinutes}), 0)::int`,
        watchedMinutes: sql<number>`coalesce(sum(case
          when ${lessonProgress.completed} then coalesce(${courseLessons.durationMinutes}, 0)
          when ${lessonProgress.watchTimeSeconds} > 0 and coalesce(${courseLessons.durationMinutes}, 0) > 0
            then least(${courseLessons.durationMinutes}::numeric, ${lessonProgress.watchTimeSeconds}::numeric / 60)
          else 0 end), 0)::float8`,
      })
      .from(courseModules)
      .innerJoin(courseLessons, eq(courseLessons.moduleId, courseModules.id))
      .leftJoin(
        lessonProgress,
        and(eq(lessonProgress.lessonId, courseLessons.id), eq(lessonProgress.userId, userId)),
      )
      .where(
        and(
          inArray(courseModules.courseId, courseIds),
          eq(courseModules.isPublished, true),
          eq(courseLessons.isPublished, true),
        ),
      )
      .groupBy(courseModules.courseId)

    for (const row of rows) {
      result.set(row.courseId, {
        lessons: row.lessons,
        durationMinutes: row.durationMinutes,
        watchedMinutes: Number(row.watchedMinutes),
      })
    }
    return result
  }
}
