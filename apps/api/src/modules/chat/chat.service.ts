import { ConflictException, Inject, Injectable } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  chatMessages,
  profiles,
  supportTickets,
  typingIndicators,
} from '../../database/schema/index.js'
import { PresenceService } from './presence.service.js'
import { RealtimeBus, type ChatMessageDto } from './realtime.bus.js'
import { isStaff, TicketAccessService, type TicketAccess } from './ticket-access.service.js'
import { TicketNotifier } from './ticket-notifier.service.js'

/** Quantas mensagens o chat carrega de uma vez (as mais recentes). */
const HISTORY_LIMIT = 500

type MessageRow = {
  id: number
  ticketId: number
  senderId: string
  message: string
  isStaff: boolean
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
  senderName: string | null
  senderAvatar: string | null
}

function toDto(row: MessageRow): ChatMessageDto {
  return {
    id: row.id,
    ticket_id: row.ticketId,
    sender_id: row.senderId,
    message: row.message,
    is_staff: row.isStaff,
    read_at: row.readAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    sender: { id: row.senderId, full_name: row.senderName, avatar_url: row.senderAvatar },
  }
}

export type SendMessageOptions = {
  /**
   * Aluno que responde um ticket "resolvido" volta o ticket para "aguardando cliente".
   */
  reopenResolved?: boolean
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(TicketAccessService) private readonly access: TicketAccessService,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
    @Inject(PresenceService) private readonly presence: PresenceService,
    @Inject(TicketNotifier) private readonly notifier: TicketNotifier,
  ) {}

  /** Histórico do chat (ordem cronológica). Só quem participa do ticket. */
  async listMessages(user: SessionUser, ticketId: number): Promise<ChatMessageDto[]> {
    await this.access.getForParticipant(user, ticketId)
    const rows = await this.db
      .select({
        id: chatMessages.id,
        ticketId: chatMessages.ticketId,
        senderId: chatMessages.senderId,
        message: chatMessages.message,
        isStaff: chatMessages.isStaff,
        readAt: chatMessages.readAt,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        senderName: profiles.fullName,
        senderAvatar: profiles.avatarUrl,
      })
      .from(chatMessages)
      .leftJoin(profiles, eq(profiles.id, chatMessages.senderId))
      .where(eq(chatMessages.ticketId, ticketId))
      .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
      .limit(HISTORY_LIMIT)
    return rows.reverse().map(toDto)
  }

  /**
   * Envia uma mensagem. Quem manda é SEMPRE o usuário da sessão e `is_staff` vem do papel dele no
   * servidor (se viesse do navegador, um aluno conseguiria se passar pelo "Suporte").
   */
  async sendMessage(
    user: SessionUser,
    ticketId: number,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<ChatMessageDto> {
    const staff = isStaff(user)
    const toNudge = new Set<string>()

    const { dto, stateChanged } = await this.db.transaction(async (tx) => {
      const ticket = await this.access.getForParticipant(user, ticketId, tx)
      if (ticket.status === 'closed') {
        throw new ConflictException('Este ticket está fechado e não aceita novas mensagens')
      }

      const [created] = await tx
        .insert(chatMessages)
        .values({ ticketId, senderId: user.id, message: text, isStaff: staff })
        .returning({
          id: chatMessages.id,
          ticketId: chatMessages.ticketId,
          senderId: chatMessages.senderId,
          message: chatMessages.message,
          isStaff: chatMessages.isStaff,
          readAt: chatMessages.readAt,
          createdAt: chatMessages.createdAt,
          updatedAt: chatMessages.updatedAt,
        })

      // O chat não dispara o gatilho do banco (ele existe só para ticket_messages): atualiza aqui.
      const reopen = Boolean(options.reopenResolved) && !staff && ticket.status === 'resolved'
      const [state] = await tx
        .update(supportTickets)
        .set(
          reopen
            ? { status: 'waiting_customer', updatedAt: new Date() }
            : { updatedAt: new Date() },
        )
        .where(eq(supportTickets.id, ticketId))
        .returning({
          status: supportTickets.status,
          assignedTo: supportTickets.assignedTo,
          updatedAt: supportTickets.updatedAt,
        })

      await this.notifyOtherSide(tx, user, ticket, staff, toNudge)

      return {
        dto: toDto({ ...created, senderName: user.name, senderAvatar: user.avatarUrl }),
        stateChanged: reopen ? state : undefined,
      }
    })

    this.bus.emitTicket({ ticketId, type: 'message', data: dto })
    if (stateChanged) {
      this.bus.emitTicket({
        ticketId,
        type: 'ticket',
        data: {
          ticket_id: ticketId,
          status: stateChanged.status,
          assigned_to: stateChanged.assignedTo,
          updated_at: stateChanged.updatedAt.toISOString(),
        },
      })
    }
    this.notifier.nudge(toNudge)
    return dto
  }

  /** "Fulano está digitando": guarda o estado e avisa quem está no chat. Ticket fechado ignora. */
  async setTyping(user: SessionUser, ticketId: number, isTyping: boolean): Promise<void> {
    const ticket = await this.access.getForParticipant(user, ticketId)
    if (ticket.status === 'closed') return

    const now = new Date()
    await this.db
      .insert(typingIndicators)
      .values({ ticketId, userId: user.id, isTyping, updatedAt: now })
      .onConflictDoUpdate({
        target: [typingIndicators.ticketId, typingIndicators.userId],
        set: { isTyping, updatedAt: now },
      })
    this.bus.emitTicket({
      ticketId,
      type: 'typing',
      data: {
        ticket_id: ticketId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: now.toISOString(),
      },
    })
  }

  /**
   * Presença. Admin consulta qualquer pessoa; os demais só a si mesmos e a quem atende os seus
   * tickets (designado ou quem já respondeu como equipe).
   */
  async isOnline(user: SessionUser, targetId: string): Promise<boolean> {
    if (targetId !== user.id && !isStaff(user)) {
      const [related] = await this.db
        .select({ id: supportTickets.id })
        .from(supportTickets)
        .where(
          and(
            eq(supportTickets.userId, user.id),
            sql`(${supportTickets.assignedTo} = ${targetId}
              OR EXISTS (
                SELECT 1 FROM ${chatMessages}
                WHERE ${chatMessages.ticketId} = ${supportTickets.id}
                  AND ${chatMessages.senderId} = ${targetId}
                  AND ${chatMessages.isStaff} = true
              ))`,
          ),
        )
        .limit(1)
      if (!related) return false
    }
    return this.presence.isOnline(targetId)
  }

  /** Quem deve ser avisado no sino quando alguém escreve no chat. */
  private async notifyOtherSide(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    sender: SessionUser,
    ticket: TicketAccess,
    senderIsStaff: boolean,
    toNudge: Set<string>,
  ) {
    const recipients = new Map<string, { title: string; link: string }>()
    if (senderIsStaff && ticket.userId !== sender.id) {
      recipients.set(ticket.userId, {
        title: 'Nova resposta no seu ticket',
        link: `/student/support/${ticket.id}`,
      })
    }
    if (!senderIsStaff && ticket.assignedTo && ticket.assignedTo !== sender.id) {
      recipients.set(ticket.assignedTo, {
        title: 'O cliente respondeu um ticket seu',
        link: `/admin/support/${ticket.id}`,
      })
    }
    for (const [userId, content] of recipients) {
      const created = await this.notifier.create(
        {
          userId,
          ticketId: ticket.id,
          title: content.title,
          message: `Ticket: ${ticket.subject}`,
          link: content.link,
        },
        tx,
      )
      if (created) toNudge.add(userId)
    }
  }
}
