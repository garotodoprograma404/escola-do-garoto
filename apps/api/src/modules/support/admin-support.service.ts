import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, desc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DB, type Database } from '../../database/database.module.js'
import {
  chatMessages,
  courses,
  enrollments,
  profiles,
  supportTickets,
  ticketMessages,
  transactions,
  userRoles,
  users,
} from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { likeContains } from '../admin-users/sql-search.js'
import { RealtimeBus } from '../chat/realtime.bus.js'
import { TicketNotifier } from '../chat/ticket-notifier.service.js'
import type { AdminTicketsQuery } from './support.schemas.js'
import { loadUnifiedMessages } from './ticket-messages.js'

export type TicketStatus = (typeof supportTickets.$inferSelect)['status']
type TicketPriority = (typeof supportTickets.$inferSelect)['priority']
type TicketCategory = (typeof supportTickets.$inferSelect)['category']

/** Fuso do negócio: "hoje" e "últimas 24 h" do painel contam o dia em horário de Brasília. */
const BUSINESS_TZ = 'America/Sao_Paulo'

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  waiting_customer: 'Aguardando cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

/** Ticket no formato do painel do admin (camelCase, como as telas esperam). */
export type AdminTicketDto = {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  subject: string
  description?: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedTo: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  messageCount: number
  tags: string[]
  courseId?: string
  courseName?: string
}

export type AdminTicketMessageDto = {
  id: string
  ticketId: string
  userId: string
  userName: string
  userAvatar?: string
  isAdmin: boolean
  message: string
  attachments?: string[]
  createdAt: string
  readAt: string | null
}

export type AdminSupportStatsDto = {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedToday: number
  /** Minutos entre abrir o ticket e a primeira resposta da equipe. */
  averageResponseTime: number
  /** Proxy: % de tickets resolvidos/fechados (ainda não existe pesquisa de satisfação). */
  satisfactionRate: number
}

export type AdminTicketContextDto = {
  user: {
    id: string
    name: string
    email: string
    role: string
    registeredAt: string
    totalCourses: number
    totalSpent: number
  }
  recentActivity: Array<{ type: string; description: string; date: string }>
  relatedTickets: Array<{ id: string; subject: string; status: TicketStatus; createdAt: string }>
}

const owner = alias(profiles, 'owner')
const ownerAccount = alias(users, 'owner_account')
const assignee = alias(profiles, 'assignee')

/** Total e última mensagem do ticket (as duas tabelas), numa subconsulta só. */
const messageCount = sql<number>`(
  (select count(*) from ${ticketMessages} where ${ticketMessages.ticketId} = ${supportTickets.id})
  + (select count(*) from ${chatMessages} where ${chatMessages.ticketId} = ${supportTickets.id})
)::int`
const lastMessageAt = sql<Date | null>`greatest(
  (select max(${ticketMessages.createdAt}) from ${ticketMessages} where ${ticketMessages.ticketId} = ${supportTickets.id}),
  (select max(${chatMessages.createdAt}) from ${chatMessages} where ${chatMessages.ticketId} = ${supportTickets.id})
)`

@Injectable()
export class AdminSupportService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
    @Inject(TicketNotifier) private readonly notifier: TicketNotifier,
  ) {}

  async stats(): Promise<AdminSupportStatsDto> {
    const [counts] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${supportTickets.status} = 'open')::int`,
        inProgress: sql<number>`count(*) filter (where ${supportTickets.status} = 'in_progress')::int`,
        done: sql<number>`count(*) filter (where ${supportTickets.status} in ('resolved','closed'))::int`,
        resolvedToday: sql<number>`count(*) filter (
          where ${supportTickets.status} in ('resolved','closed')
            and greatest(${supportTickets.resolvedAt}, ${supportTickets.closedAt})
                >= date_trunc('day', now() at time zone ${BUSINESS_TZ}) at time zone ${BUSINESS_TZ}
        )::int`,
      })
      .from(supportTickets)

    // Primeira resposta da equipe depois da criação do ticket (nas duas tabelas de mensagens).
    const { rows } = await this.db.execute<{ minutes: string | null }>(sql`
      select round(avg(round(extract(epoch from (first_reply - created_at)) / 60)))::text as minutes
      from (
        select t.created_at,
          least(
            (select min(cm.created_at) from ${chatMessages} cm
              where cm.ticket_id = t.id and cm.created_at >= t.created_at
                and (cm.is_staff = true or exists (select 1 from ${userRoles} ur
                  where ur.user_id = cm.sender_id and ur.role = 'admin' and ur.is_active = true))),
            (select min(tm.created_at) from ${ticketMessages} tm
              where tm.ticket_id = t.id and tm.created_at >= t.created_at
                and exists (select 1 from ${userRoles} ur
                  where ur.user_id = tm.user_id and ur.role = 'admin' and ur.is_active = true))
          ) as first_reply
        from ${supportTickets} t
      ) replies
      where first_reply is not null
    `)

    const total = counts?.total ?? 0
    const done = counts?.done ?? 0
    return {
      totalTickets: total,
      openTickets: counts?.open ?? 0,
      inProgressTickets: counts?.inProgress ?? 0,
      resolvedToday: counts?.resolvedToday ?? 0,
      averageResponseTime: rows[0]?.minutes ? Number(rows[0].minutes) : 0,
      satisfactionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    }
  }

  async list(query: AdminTicketsQuery): Promise<AdminTicketDto[]> {
    const filters: Array<SQL | undefined> = [
      query.status ? eq(supportTickets.status, query.status) : undefined,
      query.priority ? eq(supportTickets.priority, query.priority) : undefined,
      query.category ? eq(supportTickets.category, query.category) : undefined,
      query.assignedTo === 'UNASSIGNED'
        ? sql`${supportTickets.assignedTo} is null`
        : query.assignedTo
          ? eq(supportTickets.assignedTo, query.assignedTo)
          : undefined,
    ]
    if (query.search) {
      filters.push(
        or(
          likeContains(supportTickets.subject, query.search),
          likeContains(owner.fullName, query.search),
          likeContains(ownerAccount.email, query.search),
          likeContains(supportTickets.id, query.search),
        ),
      )
    }

    const rows = await this.db
      .select(this.ticketColumns())
      .from(supportTickets)
      .leftJoin(owner, eq(owner.id, supportTickets.userId))
      .leftJoin(ownerAccount, eq(ownerAccount.id, supportTickets.userId))
      .leftJoin(assignee, eq(assignee.id, supportTickets.assignedTo))
      .leftJoin(courses, eq(courses.id, supportTickets.courseId))
      .where(and(...filters))
      .orderBy(desc(supportTickets.updatedAt), desc(supportTickets.id))
      .limit(query.limit)
    return rows.map(toAdminTicket)
  }

  async get(ticketId: number): Promise<AdminTicketDto> {
    const [row] = await this.db
      .select(this.ticketColumns())
      .from(supportTickets)
      .leftJoin(owner, eq(owner.id, supportTickets.userId))
      .leftJoin(ownerAccount, eq(ownerAccount.id, supportTickets.userId))
      .leftJoin(assignee, eq(assignee.id, supportTickets.assignedTo))
      .leftJoin(courses, eq(courses.id, supportTickets.courseId))
      .where(eq(supportTickets.id, ticketId))
    if (!row) throw new NotFoundException('Ticket não encontrado')
    return toAdminTicket(row)
  }

  /** Conversa completa (as duas tabelas), inclusive notas internas: é a visão da equipe. */
  async messages(ticketId: number): Promise<AdminTicketMessageDto[]> {
    await this.get(ticketId)
    const messages = await loadUnifiedMessages(this.db, ticketId, { includeInternal: true })
    return messages.map((message) => ({
      id: `${message.source}:${message.id}`,
      ticketId: String(message.ticketId),
      userId: message.userId,
      userName: message.userName || 'Usuário',
      ...(message.userAvatar ? { userAvatar: message.userAvatar } : {}),
      isAdmin: message.isStaff,
      message: message.message,
      ...(message.attachments ? { attachments: message.attachments } : {}),
      createdAt: message.createdAt.toISOString(),
      readAt: null,
    }))
  }

  /** Painel lateral do ticket: quem é o cliente, quanto comprou e o que fez há pouco. */
  async context(ticketId: number): Promise<AdminTicketContextDto> {
    const ticket = await this.get(ticketId)

    const [enrollmentRows, [spent], [profile], [activeRole], related] = await Promise.all([
      this.db
        .select({ courseId: enrollments.courseId, createdAt: enrollments.createdAt })
        .from(enrollments)
        .where(eq(enrollments.studentId, ticket.userId))
        .orderBy(desc(enrollments.createdAt)),
      // Dinheiro em centavos inteiros dentro do service; reais só na resposta.
      this.db
        .select({
          cents: sql<string>`coalesce(sum(round(${transactions.amount} * 100)), 0)::text`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, ticket.userId),
            eq(transactions.type, 'sale'),
            eq(transactions.status, 'completed'),
          ),
        ),
      this.db
        .select({ createdAt: profiles.createdAt })
        .from(profiles)
        .where(eq(profiles.id, ticket.userId)),
      this.db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(and(eq(userRoles.userId, ticket.userId), eq(userRoles.isActive, true)))
        .orderBy(desc(userRoles.grantedAt))
        .limit(1),
      this.db
        .select({
          id: supportTickets.id,
          subject: supportTickets.subject,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
        })
        .from(supportTickets)
        .where(and(eq(supportTickets.userId, ticket.userId), ne(supportTickets.id, ticketId)))
        .orderBy(desc(supportTickets.createdAt))
        .limit(5),
    ])

    const recentSales = await this.db
      .select({ amount: transactions.amount, createdAt: transactions.createdAt })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, ticket.userId),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
        ),
      )
      .orderBy(desc(transactions.createdAt))
      .limit(3)

    const recentEnrollments = enrollmentRows.slice(0, 3)
    const courseIds = [...new Set(recentEnrollments.map((item) => item.courseId))]
    const titles =
      courseIds.length > 0
        ? await this.db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(inArray(courses.id, courseIds))
        : []
    const titleById = new Map(titles.map((course) => [course.id, course.title]))

    const recentActivity = [
      ...related.slice(0, 3).map((item) => ({
        type: 'ticket',
        description: `Ticket "${item.subject}" (${STATUS_LABELS[item.status]})`,
        date: item.createdAt.toISOString(),
      })),
      ...recentSales.map((sale) => ({
        type: 'purchase',
        description: `Compra aprovada de ${sale.amount.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}`,
        date: sale.createdAt.toISOString(),
      })),
      ...recentEnrollments.map((item) => ({
        type: 'enrollment',
        description: `Matrícula no curso "${titleById.get(item.courseId) ?? 'Curso'}"`,
        date: item.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    return {
      user: {
        id: ticket.userId,
        name: ticket.userName,
        email: ticket.userEmail,
        role: activeRole?.role ?? 'student',
        registeredAt: profile?.createdAt.toISOString() ?? '',
        totalCourses: enrollmentRows.length,
        totalSpent: Number(spent?.cents ?? 0) / 100,
      },
      recentActivity,
      relatedTickets: related.map((item) => ({
        id: String(item.id),
        subject: item.subject,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    }
  }

  /**
   * Atribui o ticket a um admin (quem chama, se não indicar outro) e o coloca "em andamento".
   * O responsável precisa ser admin ativo: quem está designado ganha acesso ao ticket,
   * então designar alguém sem papel de admin abriria o ticket para essa pessoa.
   */
  async assign(
    actor: SessionUser,
    ticketId: number,
    adminId: string | undefined,
    context: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<AdminTicketDto> {
    const targetId = adminId ?? actor.id
    const toNudge = new Set<string>()

    const state = await this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: userRoles.userId })
        .from(userRoles)
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(
          and(
            eq(userRoles.userId, targetId),
            eq(userRoles.role, 'admin'),
            eq(userRoles.isActive, true),
            eq(users.status, 'active'),
          ),
        )
        .limit(1)
      if (!target) throw new BadRequestException('O responsável precisa ser um administrador ativo')

      const [ticket] = await tx
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          status: supportTickets.status,
          assignedTo: supportTickets.assignedTo,
          subject: supportTickets.subject,
        })
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .for('update')
      if (!ticket) throw new NotFoundException('Ticket não encontrado')

      const now = new Date()
      await tx
        .update(supportTickets)
        .set({ assignedTo: targetId, status: 'in_progress', updatedAt: now })
        .where(eq(supportTickets.id, ticketId))

      await this.audit.log(
        {
          userId: actor.id,
          action: 'update',
          resourceType: 'support_ticket',
          resourceId: ticketId,
          changes: {
            assigned_to: { from: ticket.assignedTo, to: targetId },
            status: { from: ticket.status, to: 'in_progress' },
          },
          ...context,
        },
        tx,
      )

      if (ticket.userId !== actor.id) {
        const notified = await this.notifier.create(
          {
            userId: ticket.userId,
            ticketId,
            title: 'Seu ticket está sendo atendido',
            message: `Um atendente assumiu o ticket: ${ticket.subject}`,
            link: `/student/support/${ticketId}`,
          },
          tx,
        )
        if (notified) toNudge.add(ticket.userId)
      }
      return { at: now }
    })

    this.bus.emitTicket({
      ticketId,
      type: 'ticket',
      data: {
        ticket_id: ticketId,
        status: 'in_progress',
        assigned_to: targetId,
        updated_at: state.at.toISOString(),
      },
    })
    this.notifier.nudge(toNudge)
    return this.get(ticketId)
  }

  /** Troca o status. "Resolvido" grava `resolved_at` e "Fechado" grava `closed_at`. */
  async updateStatus(
    actor: SessionUser,
    ticketId: number,
    status: TicketStatus,
    context: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<AdminTicketDto> {
    const toNudge = new Set<string>()

    const result = await this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .select({
          id: supportTickets.id,
          userId: supportTickets.userId,
          status: supportTickets.status,
          assignedTo: supportTickets.assignedTo,
          subject: supportTickets.subject,
        })
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .for('update')
      if (!ticket) throw new NotFoundException('Ticket não encontrado')

      const now = new Date()
      await tx
        .update(supportTickets)
        .set({
          status,
          updatedAt: now,
          ...(status === 'resolved' ? { resolvedAt: now } : {}),
          ...(status === 'closed' ? { closedAt: now } : {}),
        })
        .where(eq(supportTickets.id, ticketId))

      if (ticket.status !== status) {
        await this.audit.log(
          {
            userId: actor.id,
            action: 'update',
            resourceType: 'support_ticket',
            resourceId: ticketId,
            changes: { status: { from: ticket.status, to: status } },
            ...context,
          },
          tx,
        )
        if (ticket.userId !== actor.id) {
          const notified = await this.notifier.create(
            {
              userId: ticket.userId,
              ticketId,
              title: 'Seu ticket foi atualizado',
              message: `${ticket.subject}: ${STATUS_LABELS[status]}`,
              link: `/student/support/${ticketId}`,
            },
            tx,
          )
          if (notified) toNudge.add(ticket.userId)
        }
      }
      return { at: now, assignedTo: ticket.assignedTo }
    })

    this.bus.emitTicket({
      ticketId,
      type: 'ticket',
      data: {
        ticket_id: ticketId,
        status,
        assigned_to: result.assignedTo,
        updated_at: result.at.toISOString(),
      },
    })
    this.notifier.nudge(toNudge)
    return this.get(ticketId)
  }

  private ticketColumns() {
    return {
      id: supportTickets.id,
      userId: supportTickets.userId,
      userName: owner.fullName,
      userEmail: ownerAccount.email,
      userAvatar: owner.avatarUrl,
      subject: supportTickets.subject,
      description: supportTickets.description,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      assignedTo: supportTickets.assignedTo,
      assignedToName: assignee.fullName,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      lastMessageAt,
      messageCount,
      courseId: supportTickets.courseId,
      courseName: courses.title,
    }
  }
}

function toAdminTicket(row: {
  id: number
  userId: string
  userName: string | null
  userEmail: string | null
  userAvatar: string | null
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedTo: string | null
  assignedToName: string | null
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date | string | null
  messageCount: number
  courseId: number | null
  courseName: string | null
}): AdminTicketDto {
  const lastMessage = row.lastMessageAt ? new Date(row.lastMessageAt) : null
  return {
    id: String(row.id),
    userId: row.userId,
    userName: row.userName || 'Usuário Desconhecido',
    userEmail: row.userEmail || 'Não disponível',
    ...(row.userAvatar ? { userAvatar: row.userAvatar } : {}),
    subject: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo,
    assignedToName: row.assignedToName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: (lastMessage ?? row.updatedAt).toISOString(),
    messageCount: row.messageCount,
    tags: [row.category, row.priority],
    ...(row.courseId === null ? {} : { courseId: String(row.courseId) }),
    ...(row.courseName ? { courseName: row.courseName } : {}),
  }
}
