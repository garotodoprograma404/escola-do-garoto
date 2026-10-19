import { Inject, Injectable } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, eq, gt, isNotNull, lt } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { sessions, users } from '../../database/schema/index.js'
import { UsersService } from '../users/users.service.js'
import { SESSION_TTL_MS } from './auth.constants.js'
import { generateToken, hashToken } from './crypto/opaque-token.js'

export type SessionClient = { userAgent?: string; ipAddress?: string }

export type CreatedSession = { token: string; expiresAt: Date }

export type ValidatedSession = { sessionId: string; user: SessionUser }

@Injectable()
export class SessionsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  async createSession(userId: string, client: SessionClient): Promise<CreatedSession> {
    const token = generateToken()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await this.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: client.userAgent?.slice(0, 512),
      ipAddress: client.ipAddress,
    })
    // Faxina barata: aproveita o login para apagar sessões vencidas do mesmo usuário.
    await this.db
      .delete(sessions)
      .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())))
    return { token, expiresAt }
  }

  /** Sessão válida = existe, não venceu e o usuário está ativo. */
  async validateSession(token: string): Promise<ValidatedSession | undefined> {
    const [row] = await this.db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date()),
          eq(users.status, 'active'),
          isNotNull(users.emailVerifiedAt),
        ),
      )
    if (!row) return undefined

    const user = await this.users.getSessionUser(row.userId)
    return user ? { sessionId: row.id, user } : undefined
  }

  async revokeSession(sessionId: string) {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId))
  }

  /** Usado ao entrar de novo: o cookie antigo deste navegador deixa de valer. */
  async revokeSessionByToken(token: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  }

  async revokeAllUserSessions(executor: DbExecutor, userId: string) {
    await executor.delete(sessions).where(eq(sessions.userId, userId))
  }
}
