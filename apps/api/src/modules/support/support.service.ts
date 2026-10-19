import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DB, type Database } from '../../database/database.module.js'
import {
  chatMessages,
  courses,
  enrollments,
  profiles,
  supportTickets,
  ticketMessages,
  userRoles,
  users,
} from '../../database/schema/index.js'
import { ChatService } from '../chat/chat.service.js'
import { RealtimeBus } from '../chat/realtime.bus.js'
import { TicketNotifier } from '../chat/ticket-notifier.service.js'
import type { CreateTicketInput } from './support.schemas.js'
import { loadUnifiedMessages } from './ticket-messages.js'

/** Quantos admins recebem aviso de ticket novo no sino. */
const MAX_ADMINS_NOTIFIED = 50

type TicketStatus = (typeof supportTickets.$inferSelect)['status']

/** Ticket no formato das telas do aluno (snake_case). */
export type StudentTicketDto = {
  id: string
  title: string
  description: string
  category: (typeof supportTickets.$inferSelect)['category']
  priority: (typeof supportTickets.$inferSelect)['priority']
  status: TicketStatus
  course_id: string | null
  course_title: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export type StudentMessageDto = {
  id: string
  ticket_id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  is_staff: boolean
  message: string
  created_at: string
}

export type StudentStatsDto = {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  /** Horas (uma casa decimal) entre abrir o ticket e a primeira resposta da equipe. */
  average_response_time: number
}

const OPEN_STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting_customer']
const DONE_STATUSES: TicketStatus[] = ['resolved', 'closed']
/** O aluno pode encerrar o próprio ticket enquanto ele não está fechado. */
const STUDENT_CLOSABLE: TicketStatus[] = ['open', 'in_progress', 'waiting_customer', 'resolved']

const assignee = alias(profiles, 'assignee')

@Injectable()
export class SupportService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ChatService) private readonly chat: ChatService,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
    @Inject(TicketNotifier) private readonly notifier: TicketNotifier,
  ) {}

  /**
   * Abre um ticket para quem está logado. O curso relacionado precisa ser um em que a pessoa está
   * matriculada (a tela só oferece esses): aceitar qualquer id vazaria o título de
   * curso de terceiros (até de rascunho).
   */
  async createTicket(user: SessionUser, input: CreateTicketInput): Promise<{ id: string }> {
    const courseId = input.course_id ?? null
    const toNudge = new Set<string>()

    const ticketId = await this.db.transaction(async (tx) => {
      if (courseId !== null) {
        const [enrolled] = await tx
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, courseId)))
          .limit(1)
        if (!enrolled) throw new BadRequestException('Curso inválido para este ticket')
      }

      const [created] = await tx
        .insert(supportTickets)
        .values({
          userId: user.id,
          subject: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          courseId,
          status: 'open',
        })
        .returning({ id: supportTickets.id })

      // Avisa a equipe no sino ("novo ticket").
      const admins = await tx
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(
          and(
            eq(userRoles.role, 'admin'),
            eq(userRoles.isActive, true),
            eq(users.status, 'active'),
          ),
        )
        .limit(MAX_ADMINS_NOTIFIED)
      for (const admin of admins) {
        if (admin.userId === user.id) continue
        const notified = await this.notifier.create(
          {
            userId: admin.userId,
            ticketId: created.id,
            title: 'Novo ticket de suporte',
            message: `Ticket criado: ${input.title}`,
            link: `/admin/support/${created.id}`,
          },
          tx,
        )
        if (notified) toNudge.add(admin.userId)
      }
      return created.id
    })

    this.notifier.nudge(toNudge)
    return { id: String(ticketId) }
  }

  /** Só os tickets de quem está logado. */
  async listMine(user: SessionUser): Promise<StudentTicketDto[]> {
    const rows = await this.db
      .select(this.ticketColumns())
      .from(supportTickets)
      .leftJoin(courses, eq(courses.id, supportTickets.courseId))
      .leftJoin(assignee, eq(assignee.id, supportTickets.assignedTo))
      .where(eq(supportTickets.userId, user.id))
      .orderBy(desc(supportTickets.createdAt), desc(supportTickets.id))
    return rows.map(toStudentTicket)
  }

  /** Ticket de quem está logado (de outra pessoa = 404). */
  async getMine(user: SessionUser, ticketId: number): Promise<StudentTicketDto> {
    const [row] = await this.db
      .select(this.ticketColumns())
      .from(supportTickets)
      .leftJoin(courses, eq(courses.id, supportTickets.courseId))
      .leftJoin(assignee, eq(assignee.id, supportTickets.assignedTo))
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, user.id)))
    if (!row) throw new NotFoundException('Ticket não encontrado')
    return toStudentTicket(row)
  }

  /** Conversa (as duas tabelas juntas), sem as notas internas da equipe. */
  async listMyMessages(user: SessionUser, ticketId: number): Promise<StudentMessageDto[]> {
    await this.assertOwner(user, ticketId)
    const messages = await loadUnifiedMessages(this.db, ticketId, { includeInternal: false })
    return messages.map((message) => ({
      id: `${message.source}:${message.id}`,
      ticket_id: String(message.ticketId),
      user_id: message.userId,
      user_name: message.userName || 'Usuário',
      user_avatar: message.userAvatar || null,
      is_staff: message.isStaff,
      message: message.message,
      created_at: message.createdAt.toISOString(),
    }))
  }

  async stats(user: SessionUser): Promise<StudentStatsDto> {
    const [counts] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${inArray(supportTickets.status, OPEN_STATUSES)})::int`,
        done: sql<number>`count(*) filter (where ${inArray(supportTickets.status, DONE_STATUSES)})::int`,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, user.id))

    // Média, em horas, entre abrir o ticket e a primeira resposta da equipe.
    const [response] = await this.db
      .execute<{ hours: string | null }>(
        sql`
      select round(avg(extract(epoch from (first_reply - created_at)) / 3600)::numeric, 1)::text as hours
      from (
        select t.created_at,
          least(
            (select min(cm.created_at) from ${chatMessages} cm
              where cm.ticket_id = t.id and cm.is_staff = true and cm.created_at >= t.created_at),
            (select min(tm.created_at) from ${ticketMessages} tm
              where tm.ticket_id = t.id and tm.is_internal = false and tm.created_at >= t.created_at
                and exists (select 1 from ${userRoles} ur
                  where ur.user_id = tm.user_id and ur.role = 'admin' and ur.is_active = true))
          ) as first_reply
        from ${supportTickets} t
        where t.user_id = ${user.id}
      ) replies
      where first_reply is not null
    `,
      )
      .then((result) => result.rows)

    return {
      total_tickets: counts?.total ?? 0,
      open_tickets: counts?.open ?? 0,
      resolved_tickets: counts?.done ?? 0,
      average_response_time: response?.hours ? Number(response.hours) : 0,
    }
  }

  /** Cursos da pessoa (para o formulário "novo ticket"). */
  async myCourses(user: SessionUser): Promise<Array<{ id: string; title: string }>> {
    const rows = await this.db
      .select({ id: courses.id, title: courses.title })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.studentId, user.id))
      .orderBy(desc(enrollments.createdAt))
    return rows.map((row) => ({ id: String(row.id), title: row.title }))
  }

  /** Resposta do aluno no ticket dele. O chat grava; aqui só se garante que o ticket é dele. */
  async sendMessage(user: SessionUser, ticketId: number, message: string): Promise<void> {
    await this.assertOwner(user, ticketId)
    await this.chat.sendMessage(user, ticketId, message, { reopenResolved: true })
  }

  /** O aluno encerra o próprio ticket. */
  async close(user: SessionUser, ticketId: number): Promise<void> {
    const toNudge = new Set<string>()
    const state = await this.db.transaction(async (tx) => {
      const [ticket] = await tx
        .select({
          id: supportTickets.id,
          status: supportTickets.status,
          assignedTo: supportTickets.assignedTo,
          subject: supportTickets.subject,
        })
        .from(supportTickets)
        .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, user.id)))
        .for('update')
      if (!ticket) throw new NotFoundException('Ticket não encontrado')
      if (!STUDENT_CLOSABLE.includes(ticket.status)) {
        throw new ConflictException('Este ticket já está fechado')
      }

      const now = new Date()
      await tx
        .update(supportTickets)
        .set({ status: 'closed', closedAt: now, updatedAt: now })
        .where(eq(supportTickets.id, ticketId))

      if (ticket.assignedTo && ticket.assignedTo !== user.id) {
        const notified = await this.notifier.create(
          {
            userId: ticket.assignedTo,
            ticketId,
            title: 'Ticket encerrado pelo cliente',
            message: `Ticket: ${ticket.subject}`,
            link: `/admin/support/${ticketId}`,
          },
          tx,
        )
        if (notified) toNudge.add(ticket.assignedTo)
      }
      return { assignedTo: ticket.assignedTo, at: now }
    })

    this.bus.emitTicket({
      ticketId,
      type: 'ticket',
      data: {
        ticket_id: ticketId,
        status: 'closed',
        assigned_to: state.assignedTo,
        updated_at: state.at.toISOString(),
      },
    })
    this.notifier.nudge(toNudge)
  }

  private async assertOwner(user: SessionUser, ticketId: number): Promise<void> {
    const [ticket] = await this.db
      .select({ id: supportTickets.id })
      .from(supportTickets)
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, user.id)))
    if (!ticket) throw new NotFoundException('Ticket não encontrado')
  }

  private ticketColumns() {
    return {
      id: supportTickets.id,
      subject: supportTickets.subject,
      description: supportTickets.description,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      courseId: supportTickets.courseId,
      courseTitle: courses.title,
      assignedTo: supportTickets.assignedTo,
      assignedToName: assignee.fullName,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      resolvedAt: supportTickets.resolvedAt,
    }
  }
}

function toStudentTicket(row: {
  id: number
  subject: string
  description: string
  category: StudentTicketDto['category']
  priority: StudentTicketDto['priority']
  status: TicketStatus
  courseId: number | null
  courseTitle: string | null
  assignedTo: string | null
  assignedToName: string | null
  createdAt: Date
  updatedAt: Date
  resolvedAt: Date | null
}): StudentTicketDto {
  return {
    id: String(row.id),
    title: row.subject,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    course_id: row.courseId === null ? null : String(row.courseId),
    course_title: row.courseTitle,
    assigned_to: row.assignedTo,
    assigned_to_name: row.assignedToName,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    resolved_at: row.resolvedAt?.toISOString() ?? null,
  }
}
