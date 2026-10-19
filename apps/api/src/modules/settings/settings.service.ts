import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { platformSettings } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import {
  buildGroup,
  groupKeys,
  SETTING_FIELDS,
  SETTINGS_GROUPS,
  type SettingsByGroup,
  type SettingsGroup,
} from './settings.registry.js'

/** Por quanto tempo a leitura pública fica em memória (a API é lida por quase toda página). */
const PUBLIC_CACHE_MS = 15_000

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

@Injectable()
export class SettingsService {
  private publicCache: { at: number; data: SettingsByGroup } | undefined
  /** Nos testes não há cache: eles gravam direto no banco e leem em seguida. */
  private readonly cacheMs: number

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ENV) env: Env,
  ) {
    this.cacheMs = env.NODE_ENV === 'test' ? 0 : PUBLIC_CACHE_MS
  }

  /** Configurações marcadas como públicas (`is_public`), de todos os grupos, com cache curto. */
  async getPublicSettings(): Promise<SettingsByGroup> {
    const cached = this.publicCache
    if (cached && Date.now() - cached.at < this.cacheMs) return cached.data

    const keys = SETTINGS_GROUPS.flatMap((group) => groupKeys(group))
    const rows = await this.db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(and(eq(platformSettings.isPublic, true), inArray(platformSettings.key, keys)))

    const data: SettingsByGroup = {
      general: buildGroup('general', rows),
      branding: buildGroup('branding', rows),
      financial: buildGroup('financial', rows),
      legal: buildGroup('legal', rows),
    }
    this.publicCache = { at: Date.now(), data }
    return data
  }

  async getPublicGroup<G extends SettingsGroup>(group: G): Promise<SettingsByGroup[G]> {
    return (await this.getPublicSettings())[group]
  }

  /** Leitura do admin: tudo do grupo, público ou não, sem cache. */
  async getGroupForAdmin<G extends SettingsGroup>(group: G): Promise<SettingsByGroup[G]> {
    const rows = await this.db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, groupKeys(group)))
    return buildGroup(group, rows)
  }

  /**
   * Grava os campos enviados do grupo (upsert por chave) e registra a auditoria, tudo numa
   * transação. A chave, o `is_public` e a descrição vêm do catálogo do servidor.
   */
  async saveGroup<G extends SettingsGroup>(
    group: G,
    input: Partial<SettingsByGroup[G]>,
    adminId: string,
    request: RequestInfo = {},
  ): Promise<SettingsByGroup[G]> {
    const fields = SETTING_FIELDS[group] as Record<
      string,
      { key: string; isPublic: boolean; description: string }
    >
    const entries = Object.entries(input).filter(
      ([field, value]) => value !== undefined && field in fields,
    )
    if (entries.length === 0) return this.getGroupForAdmin(group)

    const before = await this.getGroupForAdmin(group)
    const now = new Date()

    await this.db.transaction(async (tx) => {
      await tx
        .insert(platformSettings)
        .values(
          entries.map(([field, value]) => {
            const def = fields[field]!
            return {
              key: def.key,
              value,
              isPublic: def.isPublic,
              description: def.description,
              updatedBy: adminId,
              updatedAt: now,
            }
          }),
        )
        .onConflictDoUpdate({
          target: platformSettings.key,
          set: {
            value: sql`excluded.value`,
            isPublic: sql`excluded.is_public`,
            description: sql`excluded.description`,
            updatedBy: sql`excluded.updated_by`,
            updatedAt: sql`excluded.updated_at`,
          },
        })

      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'platform_settings',
          resourceId: group,
          changes: { before, fields: Object.fromEntries(entries) },
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
        },
        tx,
      )
    })

    this.publicCache = undefined
    return this.getGroupForAdmin(group)
  }
}
