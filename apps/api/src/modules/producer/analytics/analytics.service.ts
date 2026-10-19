import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { courses, enrollments, transactions } from '../../../database/schema/index.js'
import { fromCents, toCents } from '../money.js'
import { daysAgo, rangeStart, type DateRange } from '../period.js'

export type ProducerAnalytics = {
  metrics: {
    totalStudents: number
    newStudents: number
    totalRevenue: number
    averageRating: number
    completionRate: number
    activeStudents: number
  }
  studentGrowth: { date: string; count: number }[]
  completionStats: { completed: number; inProgress: number; notStarted: number }
  retentionFunnel: { stage: string; count: number; percentage: number }[]
  salesOrigins: { source: string; count: number; revenue: number }[]
  coursePerformance: {
    courseId: string
    courseTitle: string
    students: number
    revenue: number
    rating: number
    completionRate: number
    activeStudents: number
  }[]
}

const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0)

/**
 * Relatório do produtor. O que descreve o ESTADO de hoje (alunos, conclusão, funil, ativos) olha
 * todas as matrículas; o que depende do PERÍODO escolhido (novos alunos, crescimento, vendas e
 * receita) olha só o intervalo. A receita é a do próprio produtor (já sem a taxa da plataforma e a
 * comissão de afiliado) menos os reembolsos, como no painel dele.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getAnalytics(
    producerId: string,
    filters: { dateRange: DateRange; courseId?: number },
  ): Promise<ProducerAnalytics> {
    const startDate = rangeStart(filters.dateRange)
    const thirtyDaysAgo = daysAgo(30)

    // Só cursos do próprio produtor: um courseId alheio simplesmente não acha nada.
    const producerCourses = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        averageRating: courses.averageRating,
        totalReviews: courses.totalReviews,
      })
      .from(courses)
      .where(
        and(
          eq(courses.producerId, producerId),
          filters.courseId === undefined ? undefined : eq(courses.id, filters.courseId),
        ),
      )
      .orderBy(asc(courses.id))
    const courseIds = producerCourses.map((course) => course.id)

    // Estado atual das matrículas, por curso.
    const stateRows = courseIds.length
      ? await this.db
          .select({
            courseId: enrollments.courseId,
            total: sql<number>`count(*)::int`,
            completed: sql<number>`(count(*) filter (where ${enrollments.status} = 'completed'))::int`,
            inProgress: sql<number>`(count(*) filter (where ${enrollments.status} = 'active' and ${enrollments.progressPercentage} > 0 and ${enrollments.progressPercentage} < 100))::int`,
            notStarted: sql<number>`(count(*) filter (where ${enrollments.status} = 'active' and ${enrollments.progressPercentage} = 0))::int`,
            half: sql<number>`(count(*) filter (where ${enrollments.progressPercentage} >= 50))::int`,
            active: sql<number>`(count(*) filter (where ${enrollments.lastAccessedAt} >= ${thirtyDaysAgo}))::int`,
          })
          .from(enrollments)
          .where(inArray(enrollments.courseId, courseIds))
          .groupBy(enrollments.courseId)
      : []
    const stateByCourse = new Map(stateRows.map((row) => [row.courseId, row]))

    // Matrículas novas no período, por dia.
    const day = sql<string>`to_char(${enrollments.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`
    const growthRows = courseIds.length
      ? await this.db
          .select({ date: day, count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(
            and(
              inArray(enrollments.courseId, courseIds),
              startDate ? gte(enrollments.createdAt, startDate) : undefined,
            ),
          )
          .groupBy(day)
          .orderBy(day)
      : []

    // Vendas e receita no período: venda soma, reembolso subtrai; origem pela marca da venda.
    const isSale = sql`${transactions.type} = 'sale'`
    const fromAffiliate = sql`${transactions.metadata}->>'has_affiliate_attribution' = 'true'`
    const signedAmount = sql`case when ${isSale} then ${transactions.amount} else -${transactions.amount} end`
    const moneyRows = courseIds.length
      ? await this.db
          .select({
            courseId: transactions.courseId,
            sales: sql<number>`(count(*) filter (where ${isSale}))::int`,
            affiliateSales: sql<number>`(count(*) filter (where ${isSale} and ${fromAffiliate}))::int`,
            revenue: sql<string>`coalesce(sum(${signedAmount}), 0)::text`,
            affiliateRevenue: sql<string>`coalesce(sum(${signedAmount}) filter (where ${fromAffiliate}), 0)::text`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, producerId),
              inArray(transactions.type, ['sale', 'refund']),
              eq(transactions.status, 'completed'),
              inArray(transactions.courseId, courseIds),
              startDate ? gte(transactions.createdAt, startDate) : undefined,
            ),
          )
          .groupBy(transactions.courseId)
      : []
    const moneyByCourse = new Map(moneyRows.map((row) => [row.courseId, row]))

    const sumState = (pick: (row: (typeof stateRows)[number]) => number) =>
      stateRows.reduce((acc, row) => acc + pick(row), 0)
    const totalStudents = sumState((row) => row.total)
    const completedCount = sumState((row) => row.completed)
    const inProgressCount = sumState((row) => row.inProgress)
    const notStartedCount = sumState((row) => row.notStarted)
    const halfCount = sumState((row) => row.half)
    const activeStudents = sumState((row) => row.active)
    const newStudents = growthRows.reduce((acc, row) => acc + row.count, 0)

    const totalRevenueCents = moneyRows.reduce((acc, row) => acc + toCents(row.revenue), 0)
    const affiliateRevenueCents = moneyRows.reduce(
      (acc, row) => acc + toCents(row.affiliateRevenue),
      0,
    )
    const totalSales = moneyRows.reduce((acc, row) => acc + row.sales, 0)
    const affiliateSales = moneyRows.reduce((acc, row) => acc + row.affiliateSales, 0)

    // Nota média ponderada pelo número de avaliações; curso sem avaliação não puxa a média para zero.
    const totalReviews = producerCourses.reduce((acc, course) => acc + course.totalReviews, 0)
    const averageRating =
      totalReviews > 0
        ? producerCourses.reduce(
            (acc, course) => acc + (course.averageRating ?? 0) * course.totalReviews,
            0,
          ) / totalReviews
        : 0

    return {
      metrics: {
        totalStudents,
        newStudents,
        totalRevenue: fromCents(totalRevenueCents),
        averageRating,
        completionRate: pct(completedCount, totalStudents),
        activeStudents,
      },
      studentGrowth: growthRows,
      completionStats: {
        completed: completedCount,
        inProgress: inProgressCount,
        notStarted: notStartedCount,
      },
      retentionFunnel: [
        { stage: 'Matriculados', count: totalStudents, percentage: 100 },
        {
          stage: 'Iniciaram',
          count: totalStudents - notStartedCount,
          percentage: pct(totalStudents - notStartedCount, totalStudents),
        },
        { stage: '50% Concluído', count: halfCount, percentage: pct(halfCount, totalStudents) },
        {
          stage: 'Concluíram',
          count: completedCount,
          percentage: pct(completedCount, totalStudents),
        },
      ],
      salesOrigins: [
        {
          source: 'Afiliados',
          count: affiliateSales,
          revenue: fromCents(affiliateRevenueCents),
        },
        {
          source: 'Venda direta',
          count: totalSales - affiliateSales,
          revenue: fromCents(totalRevenueCents - affiliateRevenueCents),
        },
      ],
      coursePerformance: producerCourses.map((course) => {
        const state = stateByCourse.get(course.id)
        const total = state?.total ?? 0
        return {
          courseId: String(course.id),
          courseTitle: course.title,
          students: total,
          revenue: fromCents(toCents(moneyByCourse.get(course.id)?.revenue)),
          rating: course.averageRating ?? 0,
          completionRate: pct(state?.completed ?? 0, total),
          activeStudents: state?.active ?? 0,
        }
      }),
    }
  }
}
