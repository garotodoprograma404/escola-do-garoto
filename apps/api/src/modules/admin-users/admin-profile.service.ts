import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, eq, ne } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { profiles, sessions, users } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { hashPassword, verifyPassword } from '../auth/crypto/password-hasher.js'
import { UsersService } from '../users/users.service.js'
import type { AuditContext } from './audit-context.js'
import type { ChangePasswordInput, UpdateAdminProfileInput } from './admin-users.schemas.js'

/** Perfil do admin no formato que a tela já usava (snake_case, o formato que o front consome). */
export type AdminProfileDto = {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

/** Tudo aqui age SOMENTE sobre a pessoa da sessão: nenhum id vem do cliente. */
@Injectable()
export class AdminProfileService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(UsersService) private readonly accounts: UsersService,
  ) {}

  async get(user: SessionUser): Promise<AdminProfileDto> {
    const [row] = await this.db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio,
        phone: profiles.phone,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
    if (!row) throw new NotFoundException('Perfil não encontrado')
    return {
      id: row.id,
      full_name: row.fullName,
      avatar_url: row.avatarUrl,
      bio: row.bio,
      phone: row.phone,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    }
  }

  async update(user: SessionUser, input: UpdateAdminProfileInput): Promise<void> {
    await this.db
      .update(profiles)
      .set({
        fullName: input.full_name,
        bio: input.bio ?? null,
        phone: input.phone ?? null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))
  }

  async updateAvatar(user: SessionUser, avatarUrl: string): Promise<void> {
    await this.db
      .update(profiles)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(profiles.id, user.id))
  }

  /**
   * Troca a senha exigindo a senha ATUAL.
   * Ao trocar, todas as OUTRAS sessões da pessoa são encerradas; a atual continua.
   */
  async changePassword(
    user: SessionUser,
    currentSessionId: string,
    input: ChangePasswordInput,
    context: AuditContext,
  ): Promise<void> {
    const [account] = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
    if (!account || !(await verifyPassword(input.currentPassword, account.passwordHash))) {
      throw new BadRequestException('Senha atual incorreta')
    }

    const passwordHash = await hashPassword(input.newPassword)
    await this.db.transaction(async (tx) => {
      await this.accounts.updatePasswordHash(tx, user.id, passwordHash)
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), ne(sessions.id, currentSessionId)))
      await this.audit.log(
        {
          userId: user.id,
          action: 'update',
          resourceType: 'user',
          resourceId: user.id,
          metadata: { event: 'password_changed' },
          ...context,
        },
        tx,
      )
    })
  }
}
