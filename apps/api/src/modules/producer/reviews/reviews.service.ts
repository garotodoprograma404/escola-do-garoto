import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { courseReviews, courses, profiles } from '../../../database/schema/index.js'

export const REVIEW_FILTERS = ['all', '5', '4', '3', '2', '1', 'no-response'] as const
export type ReviewFilter = (typeof REVIEW_FILTERS)[number]

type ProducerReview = {
  id: string
  courseId: string
  courseTitle: string
  studentId: string
  studentName: string
  studentAvatar?: string
  enrollmentId: string
  rating: number
  title?: string
  review?: string
  response?: string
  respondedBy?: string
  respondedAt?: Date
  isVerifiedPurchase: boolean
  isFeatured: boolean
  helpfulCount: number
  createdAt: Date | null
  updatedAt: Date | null
}

export type ProducerReviews = {
  stats: {
    totalReviews: number
    averageRating: number
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number }
  }
  reviews: ProducerReview[]
}

/** Teto de avaliações por resposta (a lista não é devolvida inteira). */
const MAX_REVIEWS = 200

@Injectable()
export class ReviewsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getReviews(
    producerId: string,
    filters: { courseId?: number; filter: ReviewFilter },
  ): Promise<ProducerReviews> {
    const where = and(
      // Só avaliações de cursos DO produtor da sessão (courseId alheio simplesmente não acha nada).
      eq(courses.producerId, producerId),
      filters.courseId === undefined ? undefined : eq(courseReviews.courseId, filters.courseId),
      this.filterCondition(filters.filter),
    )

    const [stats] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        average: sql<string | null>`avg(${courseReviews.rating})::text`,
        r5: sql<number>`(count(*) filter (where ${courseReviews.rating} = 5))::int`,
        r4: sql<number>`(count(*) filter (where ${courseReviews.rating} = 4))::int`,
        r3: sql<number>`(count(*) filter (where ${courseReviews.rating} = 3))::int`,
        r2: sql<number>`(count(*) filter (where ${courseReviews.rating} = 2))::int`,
        r1: sql<number>`(count(*) filter (where ${courseReviews.rating} = 1))::int`,
      })
      .from(courseReviews)
      .innerJoin(courses, eq(courses.id, courseReviews.courseId))
      .where(where)

    const rows = await this.db
      .select({
        id: courseReviews.id,
        courseId: courseReviews.courseId,
        courseTitle: courses.title,
        studentId: courseReviews.userId,
        studentName: profiles.fullName,
        studentAvatar: profiles.avatarUrl,
        enrollmentId: courseReviews.enrollmentId,
        rating: courseReviews.rating,
        title: courseReviews.title,
        review: courseReviews.review,
        response: courseReviews.response,
        respondedBy: courseReviews.respondedBy,
        respondedAt: courseReviews.respondedAt,
        isVerifiedPurchase: courseReviews.isVerifiedPurchase,
        isFeatured: courseReviews.isFeatured,
        helpfulCount: courseReviews.helpfulCount,
        createdAt: courseReviews.createdAt,
        updatedAt: courseReviews.updatedAt,
      })
      .from(courseReviews)
      .innerJoin(courses, eq(courses.id, courseReviews.courseId))
      .leftJoin(profiles, eq(profiles.id, courseReviews.userId))
      .where(where)
      .orderBy(desc(courseReviews.createdAt), desc(courseReviews.id))
      .limit(MAX_REVIEWS)

    return {
      stats: {
        totalReviews: stats?.total ?? 0,
        averageRating: stats?.average ? Number(stats.average) : 0,
        distribution: {
          5: stats?.r5 ?? 0,
          4: stats?.r4 ?? 0,
          3: stats?.r3 ?? 0,
          2: stats?.r2 ?? 0,
          1: stats?.r1 ?? 0,
        },
      },
      reviews: rows.map((row) => ({
        id: row.id,
        courseId: String(row.courseId),
        courseTitle: row.courseTitle || 'Curso sem título',
        studentId: row.studentId,
        studentName: row.studentName || 'Aluno',
        studentAvatar: row.studentAvatar || undefined,
        enrollmentId: String(row.enrollmentId),
        rating: row.rating,
        title: row.title ?? undefined,
        review: row.review ?? undefined,
        response: row.response ?? undefined,
        respondedBy: row.respondedBy ?? undefined,
        respondedAt: row.respondedAt ?? undefined,
        isVerifiedPurchase: row.isVerifiedPurchase || false,
        isFeatured: row.isFeatured || false,
        helpfulCount: row.helpfulCount || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    }
  }

  /**
   * Responde (ou edita a resposta de) uma avaliação. Só vale para avaliação de curso do produtor da
   * sessão. Avaliação inexistente e avaliação de outro produtor dão o MESMO 404 (não revela qual existe).
   */
  async replyToReview(producerId: string, reviewId: string, response: string) {
    const [owned] = await this.db
      .select({ id: courseReviews.id })
      .from(courseReviews)
      .innerJoin(courses, eq(courses.id, courseReviews.courseId))
      .where(and(eq(courseReviews.id, reviewId), eq(courses.producerId, producerId)))
    if (!owned) throw new NotFoundException('Avaliação não encontrada')

    const now = new Date()
    const [updated] = await this.db
      .update(courseReviews)
      .set({ response, respondedBy: producerId, respondedAt: now, updatedAt: now })
      .where(eq(courseReviews.id, reviewId))
      .returning({
        id: courseReviews.id,
        response: courseReviews.response,
        respondedAt: courseReviews.respondedAt,
      })
    return updated
  }

  private filterCondition(filter: ReviewFilter): SQL | undefined {
    if (filter === 'all') return undefined
    if (filter === 'no-response') return isNull(courseReviews.response)
    return eq(courseReviews.rating, Number(filter))
  }
}
