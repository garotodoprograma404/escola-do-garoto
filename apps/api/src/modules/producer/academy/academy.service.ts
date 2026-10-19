import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { academyContent, academyProgress } from '../../../database/schema/index.js'
import { sanitizeLessonHtml } from '../../learning/lesson-html.js'

export const ACADEMY_CATEGORIES = [
  'getting_started',
  'course_creation',
  'marketing',
  'sales',
  'analytics',
  'best_practices',
] as const
export const ACADEMY_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const

export type AcademyCategory = (typeof ACADEMY_CATEGORIES)[number]
export type AcademyDifficulty = (typeof ACADEMY_DIFFICULTIES)[number]

export type AcademyContentItem = {
  id: string
  title: string
  description?: string
  contentType: string
  category: string
  videoUrl?: string
  articleContent?: string
  thumbnailUrl?: string
  durationMinutes?: number
  difficulty: string
  orderIndex: number
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  isCompleted: boolean
  progress: number
}

export type ProducerAcademy = {
  stats: {
    totalContent: number
    completedContent: number
    totalMinutes: number
    completedMinutes: number
    progressPercentage: number
  }
  contents: Omit<AcademyContentItem, 'articleContent'>[]
}

/** Campos do conteúdo (a academia é conteúdo só de leitura para o produtor; quem escreve é o admin). */
const contentColumns = {
  id: academyContent.id,
  title: academyContent.title,
  description: academyContent.description,
  contentType: academyContent.contentType,
  category: academyContent.category,
  videoUrl: academyContent.videoUrl,
  thumbnailUrl: academyContent.thumbnailUrl,
  durationMinutes: academyContent.durationMinutes,
  difficulty: academyContent.difficulty,
  orderIndex: academyContent.orderIndex,
  isPublished: academyContent.isPublished,
  createdAt: academyContent.createdAt,
  updatedAt: academyContent.updatedAt,
  completed: academyProgress.completed,
  progressPercentage: academyProgress.progressPercentage,
}

type ContentRow = {
  id: string
  title: string
  description: string | null
  contentType: string
  category: string
  videoUrl: string | null
  thumbnailUrl: string | null
  durationMinutes: number | null
  difficulty: string
  orderIndex: number
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  completed: boolean | null
  progressPercentage: number | null
}

function toItem(row: ContentRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    contentType: row.contentType,
    category: row.category,
    videoUrl: row.videoUrl ?? undefined,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    durationMinutes: row.durationMinutes ?? undefined,
    difficulty: row.difficulty,
    orderIndex: row.orderIndex,
    isPublished: row.isPublished,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isCompleted: row.completed ?? false,
    progress: row.progressPercentage ?? 0,
  }
}

@Injectable()
export class AcademyService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getContents(
    userId: string,
    filters: { category?: AcademyCategory; difficulty?: AcademyDifficulty },
  ): Promise<ProducerAcademy> {
    const rows = await this.db
      .select(contentColumns)
      .from(academyContent)
      // O progresso é SEMPRE o do usuário da sessão.
      .leftJoin(
        academyProgress,
        and(eq(academyProgress.contentId, academyContent.id), eq(academyProgress.userId, userId)),
      )
      .where(
        and(
          eq(academyContent.isPublished, true),
          filters.category ? eq(academyContent.category, filters.category) : undefined,
          filters.difficulty ? eq(academyContent.difficulty, filters.difficulty) : undefined,
        ),
      )
      .orderBy(
        asc(academyContent.orderIndex),
        asc(academyContent.createdAt),
        asc(academyContent.id),
      )

    const contents = rows.map(toItem)
    const completed = contents.filter((item) => item.isCompleted)
    const minutes = (items: typeof contents) =>
      items.reduce((sum, item) => sum + (item.durationMinutes ?? 0), 0)

    return {
      stats: {
        totalContent: contents.length,
        completedContent: completed.length,
        totalMinutes: minutes(contents),
        completedMinutes: minutes(completed),
        progressPercentage: contents.length > 0 ? (completed.length / contents.length) * 100 : 0,
      },
      contents,
    }
  }

  async getContent(userId: string, contentId: string): Promise<AcademyContentItem> {
    const [row] = await this.db
      .select({ ...contentColumns, articleContent: academyContent.articleContent })
      .from(academyContent)
      .leftJoin(
        academyProgress,
        and(eq(academyProgress.contentId, academyContent.id), eq(academyProgress.userId, userId)),
      )
      .where(and(eq(academyContent.id, contentId), eq(academyContent.isPublished, true)))
    if (!row) throw new NotFoundException('Conteúdo não encontrado')

    return { ...toItem(row), articleContent: sanitizeLessonHtml(row.articleContent) ?? undefined }
  }

  /**
   * Marca o conteúdo como concluído para o usuário da sessão. Uma linha por (usuário, conteúdo):
   * clicar duas vezes, ou em duas abas, não duplica nem dá erro.
   */
  async markComplete(userId: string, contentId: string) {
    const [content] = await this.db
      .select({ id: academyContent.id })
      .from(academyContent)
      .where(and(eq(academyContent.id, contentId), eq(academyContent.isPublished, true)))
    if (!content) throw new NotFoundException('Conteúdo não encontrado')

    const now = new Date()
    const [progress] = await this.db
      .insert(academyProgress)
      .values({
        userId,
        contentId,
        completed: true,
        completedAt: now,
        progressPercentage: 100,
      })
      .onConflictDoUpdate({
        target: [academyProgress.userId, academyProgress.contentId],
        set: { completed: true, completedAt: now, progressPercentage: 100, updatedAt: now },
      })
      .returning({
        contentId: academyProgress.contentId,
        completed: academyProgress.completed,
        completedAt: academyProgress.completedAt,
        progressPercentage: academyProgress.progressPercentage,
      })
    return progress
  }
}
