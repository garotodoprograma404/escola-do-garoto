import { Injectable } from '@nestjs/common'
import { Subject, filter, type Observable } from 'rxjs'

/** Mensagem do chat no formato que o front já esperava (snake_case, o formato que o front consome). */
export type ChatMessageDto = {
  id: number
  ticket_id: number
  sender_id: string
  message: string
  is_staff: boolean
  read_at: string | null
  created_at: string
  updated_at: string
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null
}

type TypingDto = {
  ticket_id: number
  user_id: string
  is_typing: boolean
  updated_at: string
}

type TicketStateDto = {
  ticket_id: number
  status: string
  assigned_to: string | null
  updated_at: string
}

export type TicketEvent =
  | { ticketId: number; type: 'message'; data: ChatMessageDto }
  | { ticketId: number; type: 'typing'; data: TypingDto }
  | { ticketId: number; type: 'ticket'; data: TicketStateDto }

/**
 * Barramento em memória dos eventos em tempo real.
 *
 * Funciona dentro de UM processo da API. Para rodar mais de uma instância é preciso trocar por
 * Postgres LISTEN/NOTIFY ou Redis (ver docs/areas/admin-suporte.md).
 * Quem decide QUEM pode ouvir é o controller (checa participação no ticket antes de assinar);
 * o barramento só entrega por ticket.
 */
@Injectable()
export class RealtimeBus {
  private readonly tickets = new Subject<TicketEvent>()
  private readonly notificationNudges = new Subject<string>()

  emitTicket(event: TicketEvent): void {
    this.tickets.next(event)
  }

  ticketEvents(ticketId: number): Observable<TicketEvent> {
    return this.tickets.pipe(filter((event) => event.ticketId === ticketId))
  }

  /** Avisa que o usuário recebeu notificação nova: o stream do sino consulta o banco agora. */
  nudgeNotifications(userId: string): void {
    this.notificationNudges.next(userId)
  }

  notificationNudgesFor(userId: string): Observable<string> {
    return this.notificationNudges.pipe(filter((id) => id === userId))
  }
}
