import { Inject, Injectable } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'

/** Fuso do negócio: as barras "por dia" do gráfico contam o dia em horário de Brasília. */
const BUSINESS_TZ = 'America/Sao_Paulo'

/** Pedidos que contam como receita realizada. */
const REALIZED = sql`('approved', 'free_completed')`
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export type DashboardMetricsDto = {
  totalRevenue: number
  revenueChange: number
  activeUsers: number
  usersChange: number
  publishedCourses: number
  coursesChange: number
  pendingApprovals: number
}

export type ActivityPointDto = { name: string; users: number; revenue: number }
export type CategorySliceDto = { name: string; value: number }
export type RecentActivityDto = {
  id: string
  user: { id: string; name: string }
  action: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: string
}

/** Variação percentual do período atual sobre o anterior (100% quando nasce do zero). */
export function percentageChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/** Dinheiro: somas em CENTAVOS inteiros no banco; reais só na resposta. */
const toReais = (cents: string | number | null | undefined) => Number(cents ?? 0) / 100

/** Receita da plataforma = soma de `platform_amount` dos itens de pedidos realizados. */
const orderReferenceDate = sql`coalesce(o.finalized_at, o.paid_at, o.created_at)`

/** Métricas do painel do admin: todas calculadas no banco (agregação), nunca trazendo linhas. */
@Injectable()
export class AdminDashboardService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async metrics(): Promise<DashboardMetricsDto> {
    const [revenue, counts] = await Promise.all([
      this.db.execute<{ total: string; current: string; previous: string }>(sql`
        select
          coalesce(sum(i.cents), 0)::text as total,
          coalesce(sum(i.cents) filter (where i.ref >= now() - interval '30 days'), 0)::text as current,
          coalesce(sum(i.cents) filter (
            where i.ref < now() - interval '30 days' and i.ref >= now() - interval '60 days'
          ), 0)::text as previous
        from (
          select round(oi.platform_amount * 100) as cents, ${orderReferenceDate} as ref
          from checkout_orders o
          join checkout_order_items oi on oi.order_id = o.id
          where o.status in ${REALIZED}
        ) i
      `),
      this.db.execute<{
        active_users: number
        users_current: number
        users_previous: number
        published: number
        published_current: number
        published_previous: number
        pending: number
      }>(sql`
        select
          (select count(*) from profiles where is_active = true)::int as active_users,
          (select count(*) from profiles where created_at >= now() - interval '30 days')::int as users_current,
          (select count(*) from profiles
             where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days')::int as users_previous,
          (select count(*) from courses where status = 'approved' and is_published = true)::int as published,
          (select count(*) from courses
             where status = 'approved' and is_published = true
               and published_at >= now() - interval '30 days')::int as published_current,
          (select count(*) from courses
             where status = 'approved' and is_published = true
               and published_at >= now() - interval '60 days'
               and published_at < now() - interval '30 days')::int as published_previous,
          (select count(*) from courses where status = 'pending_review' and is_published = false)::int as pending
      `),
    ])

    const money = revenue.rows[0]
    const c = counts.rows[0]
    return {
      totalRevenue: toReais(money?.total),
      revenueChange: percentageChange(Number(money?.current ?? 0), Number(money?.previous ?? 0)),
      activeUsers: c?.active_users ?? 0,
      usersChange: percentageChange(c?.users_current ?? 0, c?.users_previous ?? 0),
      publishedCourses: c?.published ?? 0,
      coursesChange: percentageChange(c?.published_current ?? 0, c?.published_previous ?? 0),
      pendingApprovals: c?.pending ?? 0,
    }
  }

  /** Últimos 7 dias (hoje incluído): cadastros e receita da plataforma por dia. */
  async activity(): Promise<ActivityPointDto[]> {
    const { rows } = await this.db.execute<{ day: string; users: number; revenue: string }>(sql`
      with days as (
        select d::date as day
        from generate_series(
          (now() at time zone ${BUSINESS_TZ})::date - 6,
          (now() at time zone ${BUSINESS_TZ})::date,
          interval '1 day'
        ) d
      ),
      signups as (
        select (p.created_at at time zone ${BUSINESS_TZ})::date as day, count(*)::int as users
        from profiles p
        where p.created_at >= ((now() at time zone ${BUSINESS_TZ})::date - 6)::timestamp at time zone ${BUSINESS_TZ}
        group by 1
      ),
      sales as (
        select (${orderReferenceDate} at time zone ${BUSINESS_TZ})::date as day,
               sum(round(oi.platform_amount * 100)) as cents
        from checkout_orders o
        join checkout_order_items oi on oi.order_id = o.id
        where o.status in ${REALIZED}
          and ${orderReferenceDate} >= ((now() at time zone ${BUSINESS_TZ})::date - 6)::timestamp at time zone ${BUSINESS_TZ}
        group by 1
      )
      select to_char(days.day, 'YYYY-MM-DD') as day,
             coalesce(signups.users, 0)::int as users,
             coalesce(sales.cents, 0)::text as revenue
      from days
      left join signups on signups.day = days.day
      left join sales on sales.day = days.day
      order by days.day
    `)
    return rows.map((row) => {
      const [year, month, date] = row.day.split('-').map(Number)
      const weekday = new Date(Date.UTC(year!, month! - 1, date!)).getUTCDay()
      return { name: WEEKDAYS[weekday]!, users: row.users, revenue: toReais(row.revenue) }
    })
  }

  /** Top 5 categorias por número de cursos publicados e aprovados. */
  async categories(): Promise<CategorySliceDto[]> {
    const { rows } = await this.db.execute<{ name: string; value: number }>(sql`
      select coalesce(c.name, 'Sem Categoria') as name, count(*)::int as value
      from courses co
      left join categories c on c.id = co.category_id
      where co.status = 'approved' and co.is_published = true
      group by coalesce(c.name, 'Sem Categoria')
      order by value desc, name asc
      limit 5
    `)
    return rows
  }

  /** As 5 atividades mais recentes entre pedidos (checkout/compra) e saques. */
  async recent(): Promise<RecentActivityDto[]> {
    const [orders, withdrawals] = await Promise.all([
      this.db.execute<{
        id: number
        user_id: string | null
        buyer_full_name: string | null
        buyer_email: string | null
        status: string
        ref: Date
        course_id: number
        course_title: string
      }>(sql`
        select o.id, o.user_id, o.buyer_full_name, o.buyer_email, o.status,
               ${orderReferenceDate} as ref, i.course_id, i.course_title
        from checkout_orders o
        join lateral (
          select course_id, course_title from checkout_order_items
          where order_id = o.id order by id limit 1
        ) i on true
        order by o.created_at desc, o.id desc
        limit 5
      `),
      this.db.execute<{
        id: number
        user_id: string
        amount_cents: string
        status: string
        ref: Date
        name: string | null
      }>(sql`
        select w.id, w.user_id, round(w.amount * 100)::text as amount_cents, w.status,
               coalesce(w.processed_at, w.requested_at) as ref,
               coalesce(p.display_name, p.full_name) as name
        from withdrawals w
        left join profiles p on p.id = w.user_id
        order by w.requested_at desc, w.id desc
        limit 5
      `),
    ])

    const fromOrders: RecentActivityDto[] = orders.rows.map((order) => ({
      id: `order-${order.id}-${order.course_id}`,
      user: {
        id: order.user_id || `guest-order-${order.id}`,
        name: order.buyer_full_name || order.buyer_email || 'Comprador',
      },
      action:
        order.status === 'free_completed'
          ? `Concluiu matrícula gratuita em "${order.course_title}"`
          : order.status === 'approved'
            ? `Concluiu compra de "${order.course_title}"`
            : `Iniciou checkout de "${order.course_title}"`,
      status:
        order.status === 'approved' || order.status === 'free_completed'
          ? 'completed'
          : order.status === 'pending' || order.status === 'in_process'
            ? 'pending'
            : 'failed',
      timestamp: new Date(order.ref).toISOString(),
    }))

    const fromWithdrawals: RecentActivityDto[] = withdrawals.rows.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      user: { id: withdrawal.user_id, name: withdrawal.name || 'Produtor' },
      action: `Solicitou saque de R$ ${toReais(withdrawal.amount_cents).toFixed(2)}`,
      status:
        withdrawal.status === 'completed'
          ? 'completed'
          : ['pending', 'approved', 'processing'].includes(withdrawal.status)
            ? 'pending'
            : 'failed',
      timestamp: new Date(withdrawal.ref).toISOString(),
    }))

    return [...fromOrders, ...fromWithdrawals]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }
}
