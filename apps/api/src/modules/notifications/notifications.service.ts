import { Inject, Injectable } from '@nestjs/common'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { notifications } from '../../database/schema/index.js'

export type NewNotification = {
  userId: string
  /** Ex.: `course_approved`, `new_message`, `withdrawal_paid`. Máx. 50 caracteres. */
  type: string
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Cria notificações do sino (era a função SQL `create_notification`). Outros módulos chamam isto
 * dentro da própria transação (`executor`), para a notificação nascer junto com o fato.
 */
@Injectable()
export class NotificationsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(data: NewNotification, executor: DbExecutor = this.db): Promise<string> {
    const [row] = await executor
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
        metadata: data.metadata ?? {},
      })
      .returning({ id: notifications.id })
    return row.id
  }
}
