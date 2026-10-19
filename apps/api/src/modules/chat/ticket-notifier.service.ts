import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { notifications } from '../../database/schema/index.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import { RealtimeBus } from './realtime.bus.js'

const SUPPORT_NOTIFICATION_TYPE = 'support'

export type TicketNotification = {
  userId: string
  ticketId: number
  title: string
  message: string
  link: string
}

/**
 * Notificações do sino ligadas a tickets de suporte. Se a pessoa já tem uma notificação NÃO lida
 * deste mesmo ticket, não cria outra (um chat movimentado não enche o sino): a existente basta
 * para ela abrir o ticket.
 */
@Injectable()
export class TicketNotifier {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
  ) {}

  /** Cria (se não houver igual não lida). Devolve `true` se criou. Use dentro da transação. */
  async create(data: TicketNotification, executor: DbExecutor = this.db): Promise<boolean> {
    const [unread] = await executor
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, data.userId),
          eq(notifications.type, SUPPORT_NOTIFICATION_TYPE),
          eq(notifications.read, false),
          sql`${notifications.metadata}->>'ticket_id' = ${String(data.ticketId)}`,
        ),
      )
      .limit(1)
    if (unread) return false

    await this.notifications.create(
      {
        userId: data.userId,
        type: SUPPORT_NOTIFICATION_TYPE,
        title: data.title,
        message: data.message.slice(0, 500),
        link: data.link,
        metadata: { ticket_id: data.ticketId },
      },
      executor,
    )
    return true
  }

  /** Empurra o sino de quem recebeu. Chame DEPOIS do commit. */
  nudge(userIds: Iterable<string>): void {
    for (const userId of userIds) this.bus.nudgeNotifications(userId)
  }
}
