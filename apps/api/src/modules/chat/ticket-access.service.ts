import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, eq, isNull } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { supportTickets, userRoles } from '../../database/schema/index.js'

export type TicketAccess = {
  id: number
  userId: string
  assignedTo: string | null
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  subject: string
}

export const isStaff = (user: Pick<SessionUser, 'roles'>): boolean => user.roles.includes('admin')

/**
 * Quem participa de um ticket: o dono, quem foi
 * designado para atender e qualquer admin. Qualquer outra pessoa recebe 404, como se o ticket
 * não existisse (não revela que o número existe).
 */
@Injectable()
export class TicketAccessService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getForParticipant(
    user: SessionUser,
    ticketId: number,
    executor: DbExecutor = this.db,
  ): Promise<TicketAccess> {
    const ticket = await this.find(ticketId, executor)
    if (!ticket || !this.canParticipate(user, ticket)) {
      throw new NotFoundException('Ticket não encontrado')
    }
    return ticket
  }

  canParticipate(user: SessionUser, ticket: TicketAccess): boolean {
    // Só o dono ou quem é admin AGORA (papéis vêm do banco a cada requisição). Ser "responsável" pelo
    // ticket não basta: um admin rebaixado perde o acesso mesmo que o ticket siga atribuído a ele.
    return isStaff(user) || ticket.userId === user.id
  }

  async find(ticketId: number, executor: DbExecutor = this.db): Promise<TicketAccess | undefined> {
    const [ticket] = await executor
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        assignedTo: supportTickets.assignedTo,
        status: supportTickets.status,
        subject: supportTickets.subject,
      })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
    return ticket
  }

  /** Papéis ATUAIS do usuário no banco (o stream longo não pode confiar no papel de quando abriu). */
  async hasActiveAdminRole(userId: string, executor: DbExecutor = this.db): Promise<boolean> {
    const [row] = await executor
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.role, 'admin'),
          eq(userRoles.isActive, true),
          isNull(userRoles.revokedAt),
        ),
      )
      .limit(1)
    return Boolean(row)
  }
}
