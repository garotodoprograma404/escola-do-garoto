import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { LearningActivityService } from './learning-activity.service.js'
import { courseReviews, courses, enrollments } from '../../database/schema/index.js'
import type { SaveReviewInput } from './learning.schemas.js'

const reviewFields = {
  id: courseReviews.id,
  courseId: courseReviews.courseId,
  rating: courseReviews.rating,
  title: courseReviews.title,
  review: courseReviews.review,
  response: courseReviews.response,
  respondedAt: courseReviews.respondedAt,
  createdAt: courseReviews.createdAt,
  updatedAt: courseReviews.updatedAt,
}

/**
 * Avaliação do curso pelo aluno. Regras: só avalia quem CONCLUIU o curso (matrícula
 * `completed`), uma avaliação por matrícula, e o aluno só edita/apaga a própria enquanto o
 * produtor não respondeu. A nota média do curso (`courses.average_rating`/`total_reviews`) é
 * recalculada na mesma transação.
 */
@Injectable()
export class ReviewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(LearningActivityService) private readonly activity: LearningActivityService,
  ) {}

  async getMyReview(userId: string, courseId: number) {
    const [row] = await this.db
      .select(reviewFields)
      .from(courseReviews)
      .where(and(eq(courseReviews.userId, userId), eq(courseReviews.courseId, courseId)))
      .limit(1)
    return row ?? null
  }

  async saveReview(userId: string, courseId: number, input: SaveReviewInput) {
    const saved = await this.saveReviewInTransaction(userId, courseId, input)
    await this.activity.emit({ type: 'review_saved', userId, courseId })
    return saved
  }

  private async saveReviewInTransaction(userId: string, courseId: number, input: SaveReviewInput) {
    return this.db.transaction(async (tx) => {
      const [enrollment] = await tx
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.studentId, userId),
            eq(enrollments.courseId, courseId),
            eq(enrollments.status, 'completed'),
          ),
        )
        .limit(1)
        .for('update')
      if (!enrollment) {
        throw new ForbiddenException('Você só pode avaliar um curso depois de concluí-lo')
      }

      const [existing] = await tx
        .select({ id: courseReviews.id, respondedBy: courseReviews.respondedBy })
        .from(courseReviews)
        .where(eq(courseReviews.enrollmentId, enrollment.id))

      let saved: { id: string }
      if (existing) {
        if (existing.respondedBy) {
          throw new ConflictException('Avaliação já respondida pelo produtor não pode ser alterada')
        }
        ;[saved] = (await tx
          .update(courseReviews)
          .set({
            rating: input.rating,
            title: input.title ?? null,
            review: input.review ?? null,
            updatedAt: new Date(),
          })
          .where(eq(courseReviews.id, existing.id))
          .returning({ id: courseReviews.id })) as [{ id: string }]
      } else {
        ;[saved] = (await tx
          .insert(courseReviews)
          .values({
            courseId,
            userId,
            enrollmentId: enrollment.id,
            rating: input.rating,
            title: input.title ?? null,
            review: input.review ?? null,
          })
          .returning({ id: courseReviews.id })) as [{ id: string }]
      }

      await this.refreshCourseRating(tx, courseId)
      const [row] = await tx
        .select(reviewFields)
        .from(courseReviews)
        .where(eq(courseReviews.id, saved.id))
      return row!
    })
  }

  async deleteMyReview(userId: string, courseId: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: courseReviews.id, response: courseReviews.response })
        .from(courseReviews)
        .where(and(eq(courseReviews.userId, userId), eq(courseReviews.courseId, courseId)))
        .for('update')
      if (!existing) throw new NotFoundException('Avaliação não encontrada')
      if (existing.response !== null) {
        throw new ConflictException('Avaliação já respondida pelo produtor não pode ser apagada')
      }
      await tx.delete(courseReviews).where(eq(courseReviews.id, existing.id))
      await this.refreshCourseRating(tx, courseId)
    })
  }

  private async refreshCourseRating(tx: DbExecutor, courseId: number) {
    await tx
      .update(courses)
      .set({
        averageRating: sql`(select round(avg(${courseReviews.rating})::numeric, 2) from ${courseReviews} where ${courseReviews.courseId} = ${courseId})`,
        totalReviews: sql`(select count(*)::int from ${courseReviews} where ${courseReviews.courseId} = ${courseId})`,
      })
      .where(eq(courses.id, courseId))
  }
}
