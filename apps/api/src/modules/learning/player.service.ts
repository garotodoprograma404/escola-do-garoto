import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  courseLessons,
  courseModules,
  courses,
  enrollments,
  lessonProgress,
  profiles,
} from '../../database/schema/index.js'
import { FilesService } from '../files/files.service.js'
import { ACCESS_STATUSES } from './learning-access.service.js'
import { sanitizeLessonHtml } from './lesson-html.js'
import { lessonWatchPercentage } from './progress-calc.js'
import { ProgressService } from './progress.service.js'

type PlayerLesson = {
  id: number
  moduleId: number
  title: string
  description: string | null
  type: 'video' | 'text' | 'quiz' | 'file'
  contentUrl: string | null
  contentText: string | null
  durationMinutes: number | null
  displayOrder: number
  isFreePreview: boolean
  isCompleted: boolean
  watchTimeSeconds: number
  progressPercentage: number
}

type PlayerModule = {
  id: number
  title: string
  description: string | null
  displayOrder: number
  lessons: PlayerLesson[]
}

export type CoursePlayerData = {
  courseId: number
  courseTitle: string
  courseSlug: string
  producerName: string
  producerAvatar: string | null
  thumbnailUrl: string | null
  modules: PlayerModule[]
  totalLessons: number
  completedLessons: number
  progressPercentage: number
}

/** Material de aula guardado em bucket privado (`documents`): o aluno recebe um link assinado. */
const PRIVATE_FILE_URL =
  /^\/api\/files\/(?:public|signed)\/documents\/([A-Za-z0-9_\-./]+)(?:\?.*)?$/

/** Link do material válido por 1 h (dá tempo de abrir a aula e baixar). */
const FILE_LINK_TTL_SECONDS = 3600

@Injectable()
export class PlayerService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}

  /**
   * Dados do player: curso, módulos e aulas PUBLICADOS e o progresso do aluno. Exige matrícula
   * ativa ou concluída; sem ela o curso "não existe" para a pessoa (404).
   */
  async getCoursePlayerData(userId: string, slug: string): Promise<CoursePlayerData> {
    const [course] = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        thumbnailUrl: courses.thumbnailUrl,
        producerId: courses.producerId,
      })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1)
    if (!course) throw new NotFoundException('Curso não encontrado')

    const [enrollment] = await this.db
      .select({
        id: enrollments.id,
        progressPercentage: enrollments.progressPercentage,
        completedLessons: enrollments.completedLessons,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId, course.id),
          inArray(enrollments.status, [...ACCESS_STATUSES]),
        ),
      )
      .limit(1)
    if (!enrollment) throw new NotFoundException('Curso não encontrado')

    const [producer] = await this.db
      .select({ fullName: profiles.fullName, avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(eq(profiles.id, course.producerId))
      .limit(1)

    const modules = await this.db
      .select({
        id: courseModules.id,
        title: courseModules.title,
        description: courseModules.description,
        displayOrder: courseModules.displayOrder,
      })
      .from(courseModules)
      .where(and(eq(courseModules.courseId, course.id), eq(courseModules.isPublished, true)))
      .orderBy(asc(courseModules.displayOrder), asc(courseModules.id))

    const moduleIds = modules.map((courseModule) => courseModule.id)
    const lessons = moduleIds.length
      ? await this.db
          .select({
            id: courseLessons.id,
            moduleId: courseLessons.moduleId,
            title: courseLessons.title,
            description: courseLessons.description,
            type: courseLessons.type,
            contentUrl: courseLessons.contentUrl,
            contentText: courseLessons.contentText,
            durationMinutes: courseLessons.durationMinutes,
            displayOrder: courseLessons.displayOrder,
            isFreePreview: courseLessons.isFreePreview,
          })
          .from(courseLessons)
          .where(
            and(inArray(courseLessons.moduleId, moduleIds), eq(courseLessons.isPublished, true)),
          )
          .orderBy(asc(courseLessons.displayOrder), asc(courseLessons.id))
      : []

    const lessonIds = lessons.map((lesson) => lesson.id)
    const progressRows = lessonIds.length
      ? await this.db
          .select({
            lessonId: lessonProgress.lessonId,
            completed: lessonProgress.completed,
            watchTimeSeconds: lessonProgress.watchTimeSeconds,
          })
          .from(lessonProgress)
          .where(
            and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, lessonIds)),
          )
      : []
    const progressByLesson = new Map(progressRows.map((row) => [row.lessonId, row]))

    const playerModules: PlayerModule[] = modules.map((courseModule) => ({
      ...courseModule,
      lessons: lessons
        .filter((lesson) => lesson.moduleId === courseModule.id)
        .map((lesson) => {
          const done = progressByLesson.get(lesson.id)
          const watchTimeSeconds = done?.watchTimeSeconds ?? 0
          return {
            ...lesson,
            contentUrl: this.resolveContentUrl(lesson.contentUrl, course.producerId),
            contentText: sanitizeLessonHtml(lesson.contentText),
            isCompleted: done?.completed ?? false,
            watchTimeSeconds,
            progressPercentage: lessonWatchPercentage(watchTimeSeconds, lesson.durationMinutes),
          }
        }),
    }))

    // Marca o último acesso ao curso.
    await this.progress.touchLastAccess(enrollment.id)

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      producerName: producer?.fullName || 'Produtor',
      producerAvatar: producer?.avatarUrl ?? null,
      thumbnailUrl: course.thumbnailUrl,
      modules: playerModules,
      totalLessons: lessons.length,
      completedLessons: enrollment.completedLessons,
      progressPercentage: enrollment.progressPercentage,
    }
  }

  /**
   * Aula gratuita (prévia): qualquer pessoa assiste sem matrícula, mas só se a aula e o módulo
   * estiverem publicados e o curso aprovado/publicado. Aula paga NUNCA sai por aqui.
   */
  async getFreePreviewLesson(lessonId: number) {
    const [lesson] = await this.db
      .select({
        id: courseLessons.id,
        moduleId: courseLessons.moduleId,
        title: courseLessons.title,
        description: courseLessons.description,
        type: courseLessons.type,
        contentUrl: courseLessons.contentUrl,
        contentText: courseLessons.contentText,
        durationMinutes: courseLessons.durationMinutes,
        courseSlug: courses.slug,
        producerId: courses.producerId,
      })
      .from(courseLessons)
      .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.isFreePreview, true),
          eq(courseLessons.isPublished, true),
          eq(courseModules.isPublished, true),
          eq(courses.isPublished, true),
          eq(courses.status, 'approved'),
        ),
      )
      .limit(1)
    if (!lesson) throw new NotFoundException('Aula de prévia não encontrada')

    const { producerId, ...visible } = lesson
    return {
      ...visible,
      // Quiz não tem prévia (o gabarito só existe dentro da matrícula).
      contentUrl:
        lesson.type === 'quiz' ? null : this.resolveContentUrl(lesson.contentUrl, producerId),
      contentText: lesson.type === 'quiz' ? null : sanitizeLessonHtml(lesson.contentText),
    }
  }

  /**
   * Link assinado só para material do PRÓPRIO produtor do curso (`<pasta>/<producerId>/…` no bucket
   * `documents`): o player nunca assina arquivo de outro produtor nem certificado.
   */
  private resolveContentUrl(url: string | null, producerId: string): string | null {
    if (!url) return null
    const match = PRIVATE_FILE_URL.exec(url)
    if (!match) return url
    const path = match[1]!
    if (path.split('/')[1] !== producerId) return null
    try {
      return this.files.signedUrl('documents', path, FILE_LINK_TTL_SECONDS)
    } catch {
      // Caminho fora do padrão aceito pelo storage: não entrega o link.
      return null
    }
  }
}
