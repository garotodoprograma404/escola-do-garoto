import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import {
  courses,
  enrollments,
  profiles,
  transactions,
  withdrawals,
} from '../../../database/schema/index.js'
import { fromCents, toCents } from '../money.js'

export type DashboardStats = {
  totalCourses: number
  totalStudents: number
  totalRevenue: number
  monthRevenue: number
  pendingWithdrawals: number
  averageRating: number | null
}

export type RevenueChartData = { date: string; revenue: number; sales: number }

export type RecentSale = {
  id: number
  studentName: string
  courseName: string
  amount: number
  date: Date
  status: 'completed' | 'pending' | 'refunded'
}

export type CoursePerformance = {
  id: number
  title: string
  students: number
  revenue: number
  rating: number | null
  completionRate: number
}

/** Início do mês corrente no fuso do Brasil (o "mês" que o produtor enxerga). */
const MONTH_START = sql`date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`

/**
 * Dashboard do produtor. Tudo é filtrado pelo id da SESSÃO e agregado no banco: o custo
 * acompanha o resumo devolvido, não o tamanho do histórico de vendas.
 */
@Injectable()
export class DashboardService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getStats(producerId: string): Promise<DashboardStats> {
    const [courseTotals] = await this.db
      .select({
        courseCount: sql<number>`count(*)::int`,
        publishedCount: sql<number>`(count(*) filter (where ${courses.isPublished} = true))::int`,
        studentsFromCourses: sql<number>`coalesce(sum(greatest(0, ${courses.totalStudents})), 0)::int`,
      })
      .from(courses)
      .where(eq(courses.producerId, producerId))

    let totalStudents = courseTotals?.studentsFromCourses ?? 0
    if (totalStudents === 0 && (courseTotals?.courseCount ?? 0) > 0) {
      const [row] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(eq(courses.producerId, producerId))
      totalStudents = row?.total ?? 0
    }

    const [money] = await this.db
      .select({
        movements: sql<number>`count(*)::int`,
        sales: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'sale' and ${transactions.status} = 'completed'), 0)::text`,
        refunds: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'refund' and ${transactions.status} in ('completed', 'refunded')), 0)::text`,
        monthSales: sql<string>`coalesce(sum(abs(${transactions.amount})) filter (where ${transactions.type} = 'sale' and ${transactions.status} = 'completed' and ${transactions.createdAt} >= ${MONTH_START}), 0)::text`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, producerId),
          inArray(transactions.type, ['sale', 'refund', 'commission', 'affiliate_commission']),
        ),
      )

    const totalRevenueCents = Math.max(0, toCents(money?.sales) - toCents(money?.refunds))

    // Sem nenhuma movimentação financeira real o painel fica limpo.
    let pendingWithdrawalsCents = 0
    if ((money?.movements ?? 0) > 0) {
      const [pending] = await this.db
        .select({ total: sql<string>`coalesce(sum(abs(${withdrawals.amount})), 0)::text` })
        .from(withdrawals)
        .where(
          and(
            eq(withdrawals.userId, producerId),
            eq(withdrawals.accountScope, 'producer'),
            inArray(withdrawals.status, ['pending', 'approved', 'processing']),
          ),
        )
      pendingWithdrawalsCents = toCents(pending?.total)
    }

    const [profile] = await this.db
      .select({ averageRating: profiles.averageRating })
      .from(profiles)
      .where(eq(profiles.id, producerId))

    return {
      totalCourses: courseTotals?.publishedCount ?? 0,
      totalStudents,
      totalRevenue: fromCents(totalRevenueCents),
      monthRevenue: fromCents(toCents(money?.monthSales)),
      pendingWithdrawals: fromCents(pendingWithdrawalsCents),
      averageRating: profile?.averageRating || null,
    }
  }

  /** Receita por dia nos últimos 30 dias (só os dias com venda). */
  async getRevenueChart(producerId: string): Promise<RevenueChartData[]> {
    const day = sql<string>`to_char(${transactions.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`
    const rows = await this.db
      .select({
        date: day,
        revenue: sql<string>`sum(abs(${transactions.amount}))::text`,
        sales: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, producerId),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
          sql`${transactions.createdAt} >= now() - interval '30 days'`,
        ),
      )
      .groupBy(day)
      .orderBy(day)

    return rows.map((row) => ({
      date: row.date,
      revenue: fromCents(toCents(row.revenue)),
      sales: row.sales,
    }))
  }

  /** Últimas 5 vendas. O nome do aluno só vem de matrícula em curso DESTE produtor. */
  async getRecentSales(producerId: string): Promise<RecentSale[]> {
    const rows = await this.db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        status: transactions.status,
        date: transactions.createdAt,
        studentName: profiles.fullName,
        courseTitle: courses.title,
      })
      .from(transactions)
      .leftJoin(enrollments, eq(enrollments.id, transactions.enrollmentId))
      .leftJoin(
        courses,
        and(
          eq(courses.id, sql`coalesce(${enrollments.courseId}, ${transactions.courseId})`),
          eq(courses.producerId, producerId),
        ),
      )
      .leftJoin(profiles, and(eq(profiles.id, enrollments.studentId), isNotNull(courses.id)))
      .where(and(eq(transactions.userId, producerId), eq(transactions.type, 'sale')))
      .orderBy(desc(transactions.createdAt), desc(transactions.id))
      .limit(5)

    return rows.map((row) => ({
      id: row.id,
      studentName: row.studentName || 'Aluno',
      courseName: row.courseTitle || 'Curso',
      amount: fromCents(Math.abs(toCents(row.amount))),
      date: row.date,
      status: row.status === 'completed' || row.status === 'refunded' ? row.status : 'pending',
    }))
  }

  /** Os 5 cursos publicados com mais alunos, com receita e taxa de conclusão. */
  async getCoursePerformance(producerId: string): Promise<CoursePerformance[]> {
    const top = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        students: courses.totalStudents,
        rating: courses.averageRating,
      })
      .from(courses)
      .where(and(eq(courses.producerId, producerId), eq(courses.isPublished, true)))
      .orderBy(desc(courses.totalStudents), desc(courses.id))
      .limit(5)
    if (top.length === 0) return []

    const ids = top.map((course) => course.id)

    const revenueRows = await this.db
      .select({
        courseId: transactions.courseId,
        revenue: sql<string>`sum(abs(${transactions.amount}))::text`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, producerId),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
          inArray(transactions.courseId, ids),
        ),
      )
      .groupBy(transactions.courseId)
    const revenueByCourse = new Map(revenueRows.map((row) => [row.courseId, toCents(row.revenue)]))

    const completionRows = await this.db
      .select({
        courseId: enrollments.courseId,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`(count(*) filter (where ${enrollments.status} = 'completed'))::int`,
      })
      .from(enrollments)
      .where(inArray(enrollments.courseId, ids))
      .groupBy(enrollments.courseId)
    const completionByCourse = new Map(completionRows.map((row) => [row.courseId, row]))

    return top.map((course) => {
      const completion = completionByCourse.get(course.id)
      const rate =
        completion && completion.total > 0 ? (completion.completed / completion.total) * 100 : 0
      return {
        id: course.id,
        title: course.title,
        students: course.students,
        revenue: fromCents(revenueByCourse.get(course.id) ?? 0),
        rating: course.rating,
        completionRate: Math.round(rate),
      }
    })
  }
}
