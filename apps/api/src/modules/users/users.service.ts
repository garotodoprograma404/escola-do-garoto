import { Inject, Injectable } from '@nestjs/common'
import type { Role, SessionUser } from '@vox/contracts'
import { and, asc, eq, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { profiles, userRoles, users } from '../../database/schema/index.js'

/** Intervalo mínimo entre dois avisos "você já tem conta" para a mesma conta. */
const ACCOUNT_NOTICE_COOLDOWN_MS = 60 * 60 * 1000

export type UserCredentials = {
  id: string
  passwordHash: string
  status: 'active' | 'suspended'
  emailVerifiedAt: Date | null
}

export type UserAccount = {
  id: string
  status: 'active' | 'suspended'
  emailVerifiedAt: Date | null
}

export type NewUser = { name: string; email: string; passwordHash: string }

/** Acesso aos dados de conta. Regras de autenticação ficam no AuthService. */
@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findCredentialsByEmail(email: string): Promise<UserCredentials | undefined> {
    const [row] = await this.db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, email))
    return row
  }

  async findActiveUserIdByEmail(email: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.status, 'active')))
    return row?.id
  }

  async findAccountByEmail(email: string): Promise<UserAccount | undefined> {
    const [row] = await this.db
      .select({ id: users.id, status: users.status, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.email, email))
    return row
  }

  /** Cria a conta com um papel inicial. Lança erro de unicidade se o e-mail já existir. */
  async createUserWithRole(executor: DbExecutor, data: NewUser, role: Role): Promise<string> {
    const [created] = await executor
      .insert(users)
      .values({ email: data.email, passwordHash: data.passwordHash })
      .returning({ id: users.id })
    await executor.insert(profiles).values({ id: created.id, fullName: data.name })
    await executor.insert(userRoles).values({ userId: created.id, role })
    return created.id
  }

  async getActiveRoles(executor: DbExecutor, userId: string): Promise<Role[]> {
    const rows = await executor
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          isNull(userRoles.revokedAt),
        ),
      )
      // Ordem estável: o papel mais antigo é o principal (o front usa o primeiro).
      .orderBy(asc(userRoles.createdAt), asc(userRoles.id))
    return rows.map((row) => row.role)
  }

  /**
   * Usuário no formato público da sessão. `undefined` se não existe, está suspenso ou ainda não
   * confirmou o e-mail: conta sem e-mail confirmado nunca tem sessão.
   */
  async getSessionUser(
    userId: string,
    executor: DbExecutor = this.db,
  ): Promise<SessionUser | undefined> {
    const [user] = await executor
      .select({
        id: users.id,
        name: profiles.fullName,
        email: users.email,
        avatarUrl: profiles.avatarUrl,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.id, users.id))
      .where(
        and(eq(users.id, userId), eq(users.status, 'active'), isNotNull(users.emailVerifiedAt)),
      )
    if (!user) return undefined
    return { ...user, roles: await this.getActiveRoles(executor, userId) }
  }

  /**
   * Ativa uma conta pendente com as credenciais do cadastro que gerou o link confirmado e marca o
   * e-mail como confirmado. `false` se a conta já estava confirmada (não sobrescreve nada).
   */
  async activateWithCredentials(
    executor: DbExecutor,
    userId: string,
    data: { name: string; passwordHash: string },
  ): Promise<boolean> {
    const updated = await executor
      .update(users)
      .set({ passwordHash: data.passwordHash, emailVerifiedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
      .returning({ id: users.id })
    if (updated.length === 0) return false
    await executor.update(profiles).set({ fullName: data.name }).where(eq(profiles.id, userId))
    return true
  }

  /**
   * Reserva o direito de mandar o aviso "você já tem conta" (no máximo um por hora por conta).
   * `true` = pode enviar agora.
   */
  async claimAccountExistsNotice(userId: string): Promise<boolean> {
    const updated = await this.db
      .update(users)
      .set({ accountExistsNoticeAt: new Date() })
      .where(
        and(
          eq(users.id, userId),
          or(
            isNull(users.accountExistsNoticeAt),
            lt(users.accountExistsNoticeAt, new Date(Date.now() - ACCOUNT_NOTICE_COOLDOWN_MS)),
          ),
        ),
      )
      .returning({ id: users.id })
    return updated.length > 0
  }

  /** Marca o e-mail como confirmado (só na primeira vez). */
  async markEmailVerified(executor: DbExecutor, userId: string) {
    await executor
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
  }

  async updatePasswordHash(executor: DbExecutor, userId: string, passwordHash: string) {
    await executor.update(users).set({ passwordHash }).where(eq(users.id, userId))
  }

  async recordLogin(userId: string) {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId))
  }
}
