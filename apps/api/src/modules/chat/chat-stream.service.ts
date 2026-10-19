import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import type { MessageEvent } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { map, type Observable } from 'rxjs'
import { NotificationsFeedService } from './notifications-feed.service.js'
import { PresenceService } from './presence.service.js'
import { RealtimeBus } from './realtime.bus.js'
import { buildSse, leaseUntilSubscribed } from './sse.js'
import { TicketAccessService } from './ticket-access.service.js'

/** Stream (SSE) de um ticket: mensagens novas, "digitando" e mudança de status. */
@Injectable()
export class ChatStreamService {
  constructor(
    @Inject(TicketAccessService) private readonly access: TicketAccessService,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
    @Inject(PresenceService) private readonly presence: PresenceService,
    @Inject(NotificationsFeedService) private readonly feed: NotificationsFeedService,
  ) {}

  /**
   * A checagem de participação acontece ANTES de abrir o stream (quem não participa recebe 404) e
   * se repete a cada ~30 s, olhando papel, designação e sessão ATUAIS no banco.
   */
  async openTicketStream(
    user: SessionUser,
    sessionId: string,
    ticketId: number,
  ): Promise<Observable<MessageEvent>> {
    await this.access.getForParticipant(user, ticketId)

    const release = this.presence.connect(user.id)
    if (!release) {
      throw new HttpException(
        'Muitas conexões abertas. Feche outras abas.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return buildSse({
      initial: [{ type: 'ready', data: { ticket_id: ticketId, at: new Date().toISOString() } }],
      source: this.bus
        .ticketEvents(ticketId)
        .pipe(map((event): MessageEvent => ({ type: event.type, data: event.data }))),
      stillAllowed: async () => {
        if (!(await this.feed.sessionStillValid(sessionId))) return false
        const ticket = await this.access.find(ticketId)
        if (!ticket) return false
        if (ticket.userId === user.id) return true
        return this.access.hasActiveAdminRole(user.id)
      },
      onBeat: () => this.presence.touch(user.id),
      ...leaseUntilSubscribed(release),
    })
  }
}
