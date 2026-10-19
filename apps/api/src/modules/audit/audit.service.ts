import { Inject, Injectable } from '@nestjs/common'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { adminAuditLog } from '../../database/schema/index.js'

type AuditAction = (typeof adminAuditLog.$inferInsert)['action']

export type AuditEntry = {
  /** Quem fez (sempre o usuário da sessão, nunca um id vindo do cliente). */
  userId: string
  action: AuditAction
  resourceType: string
  resourceId?: string | number | null
  changes?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

/** Trilha de auditoria das ações de admin. */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async log(entry: AuditEntry, executor: DbExecutor = this.db): Promise<void> {
    await executor.insert(adminAuditLog).values({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId == null ? null : String(entry.resourceId),
      changes: entry.changes ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    })
  }
}
