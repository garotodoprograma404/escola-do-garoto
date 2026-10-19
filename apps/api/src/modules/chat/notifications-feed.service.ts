import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import type { MessageEvent } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import {
  catchError,
  concatWith,
  EMPTY,
  exhaustMap,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  timer,
  type Observable,
} from 'rxjs'
import { DB, type Database } from '../../database/database.module.js'
import { notifications, sessions, users } from '../../database/schema/index.js'
import { PresenceService } from './presence.service.js'
import { RealtimeBus } from './realtime.bus.js'
import { buildSse, leaseUntilSubscribed } from './sse.js'

/** Formato do sino no front (snake_case, o formato que o front consome). */
export type NotificationDto = {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
  read_at: string | null
}

const POLL_MS = 5000
/** Folga ao procurar novidades: uma transação lenta grava `created_at` do começo dela. */
const CURSOR_SLACK_MS = 30_000

const columns = {
  id: notifications.id,
  userId: notifications.userId,
  type: notifications.type,
  title: notifications.title,
  message: notifications.message,
  link: notifications.link,
  read: notifications.read,
  metadata: notifications.metadata,
  createdAt: notifications.createdAt,
  readAt: notifications.readAt,
}

type Row = {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean | null
  metadata: unknown
  createdAt: Date | null
  readAt: Date | null
}

function toDto(row: Row): NotificationDto {
  return {
    id: row.id,
    user_id: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    read: row.read ?? false,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    read_at: row.readAt?.toISOString() ?? null,
  }
}

/** Sino de notificações: listar, marcar como lida, contar e acompanhar em tempo real. */
@Injectable()
export class NotificationsFeedService {
  private readonly logger = new Logger(NotificationsFeedService.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(RealtimeBus) private readonly bus: RealtimeBus,
    @Inject(PresenceService) private readonly presence: PresenceService,
  ) {}

  async list(
    user: SessionUser,
    options: { limit: number; unreadOnly: boolean },
  ): Promise<NotificationDto[]> {
    const rows = await this.db
      .select(columns)
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          options.unreadOnly ? eq(notifications.read, false) : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(options.limit)
    return rows.map(toDto)
  }

  async stats(user: SessionUser): Promise<{ total: number; unread: number }> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        unread: sql<number>`count(*) filter (where ${notifications.read} is not true)::int`,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
    return { total: row?.total ?? 0, unread: row?.unread ?? 0 }
  }

  /** Sempre filtrado pelo dono: notificação de outra pessoa simplesmente "não existe". */
  async markRead(user: SessionUser, id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
  }

  async markAllRead(user: SessionUser): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)))
  }

  async remove(user: SessionUser, id: string): Promise<void> {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
  }

  async removeRead(user: SessionUser): Promise<void> {
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, true)))
  }

  /**
   * Stream do sino (SSE). Entrega só as notificações DA PESSOA da sessão. Notificações criadas
   * por qualquer módulo aparecem em até ~5 s (consulta barata e indexada); as de suporte chegam
   * na hora, porque o próprio fluxo "cutuca" o stream.
   */
  openStream(user: SessionUser, sessionId: string): Observable<MessageEvent> {
    const release = this.presence.connect(user.id)
    if (!release) {
      throw new HttpException(
        'Muitas conexões abertas. Feche outras abas.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const sent = new Set<string>()
    let cursor = new Date()

    const fetchNew = async (): Promise<NotificationDto[]> => {
      const since = new Date(cursor.getTime() - CURSOR_SLACK_MS)
      const rows = await this.db
        .select(columns)
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), gt(notifications.createdAt, since)))
        .orderBy(asc(notifications.createdAt), asc(notifications.id))
        .limit(50)
      const fresh: NotificationDto[] = []
      for (const row of rows) {
        if (row.createdAt && row.createdAt > cursor) cursor = row.createdAt
        if (sent.has(row.id)) continue
        sent.add(row.id)
        fresh.push(toDto(row))
      }
      if (sent.size > 500) {
        const keep = [...sent].slice(-200)
        sent.clear()
        for (const id of keep) sent.add(id)
      }
      return fresh
    }

    const updates = merge(timer(POLL_MS, POLL_MS), this.bus.notificationNudgesFor(user.id)).pipe(
      exhaustMap(() =>
        from(fetchNew()).pipe(
          catchError((error: unknown) => {
            this.logger.warn(`Falha ao buscar notificações novas: ${String(error)}`)
            return EMPTY
          }),
        ),
      ),
      filter((fresh) => fresh.length > 0),
      map((fresh): MessageEvent => ({ type: 'notifications', data: fresh })),
    )

    return buildSse({
      // O sino carrega a lista inicial pelo GET normal; o stream só traz novidades.
      initial: [{ type: 'ready', data: { at: new Date().toISOString() } }],
      // Primeiro registra o que já existe (sem enviar); depois só o que for novo.
      source: from(fetchNew().catch(() => [])).pipe(ignoreElements(), concatWith(updates)),
      stillAllowed: () => this.sessionStillValid(sessionId),
      onBeat: () => this.presence.touch(user.id),
      ...leaseUntilSubscribed(release),
    })
  }

  /** Sessão ainda existe, não venceu e a conta continua ativa. */
  async sessionStillValid(sessionId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          gt(sessions.expiresAt, new Date()),
          eq(users.status, 'active'),
        ),
      )
    return Boolean(row)
  }
}
