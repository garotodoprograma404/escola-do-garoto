import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, asc, eq, gte, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { likeContains } from '../../common/search/like-contains.js'
import { DB, type Database } from '../../database/database.module.js'
import { banners } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { calculateBannerStatus, calculateDaysUntilExpiration } from './banner-status.js'
import type { BannerBody, ListBannersQuery } from './content.schemas.js'
import { moveInList } from './ordering.js'

/** Máximo de banners ligados ao mesmo tempo. */
const MAX_ACTIVE_BANNERS = 5
/** Chave do lock que serializa quem liga banners (evita passar do limite com cliques simultâneos). */
const ACTIVE_LIMIT_LOCK = 4_101_001

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

const adminFields = {
  id: banners.id,
  title: banners.title,
  subtitle: banners.subtitle,
  image_url: banners.imageUrl,
  mobile_image_url: banners.mobileImageUrl,
  link_url: banners.linkUrl,
  link_text: banners.linkText,
  device: banners.device,
  background_color: banners.backgroundColor,
  text_color: banners.textColor,
  display_order: banners.displayOrder,
  is_active: banners.isActive,
  start_date: banners.startDate,
  end_date: banners.endDate,
  total_clicks: banners.totalClicks,
  total_views: banners.totalViews,
  position: banners.position,
  created_at: banners.createdAt,
  updated_at: banners.updatedAt,
}

/** O que a home precisa para desenhar o banner (sem contadores). */
const publicFields = {
  id: banners.id,
  title: banners.title,
  subtitle: banners.subtitle,
  image_url: banners.imageUrl,
  mobile_image_url: banners.mobileImageUrl,
  link_url: banners.linkUrl,
  link_text: banners.linkText,
  background_color: banners.backgroundColor,
  text_color: banners.textColor,
  display_order: banners.displayOrder,
  start_date: banners.startDate,
  end_date: banners.endDate,
  position: banners.position,
}

@Injectable()
export class BannersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Banners no ar agora: ligados e dentro do prazo. */
  listPublic(position: 'hero' | 'mid-page' | 'popup') {
    const now = new Date()
    return this.db
      .select(publicFields)
      .from(banners)
      .where(
        and(
          eq(banners.position, position),
          eq(banners.isActive, true),
          or(isNull(banners.startDate), lte(banners.startDate, now)),
          or(isNull(banners.endDate), gte(banners.endDate, now)),
        ),
      )
      .orderBy(asc(banners.displayOrder), asc(banners.id))
  }

  async list(query: ListBannersQuery) {
    const conditions: SQL[] = []
    if (query.position) conditions.push(eq(banners.position, query.position))
    const term = query.search?.trim()
    if (term) {
      conditions.push(or(likeContains(banners.title, term), likeContains(banners.subtitle, term))!)
    }

    const rows = await this.db
      .select(adminFields)
      .from(banners)
      .where(and(...conditions))
      .orderBy(asc(banners.displayOrder), asc(banners.id))

    const withStatus = rows.map((row) => this.withStatus(row))
    return query.status
      ? withStatus.filter((row) => row.computed_status === query.status)
      : withStatus
  }

  async countActive(): Promise<{ count: number }> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(banners)
      .where(eq(banners.isActive, true))
    return { count: row?.count ?? 0 }
  }

  async create(body: BannerBody, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      if (body.isActive) await this.assertCanActivate(tx)

      const [last] = await tx
        .select({ next: sql<number>`coalesce(max(${banners.displayOrder}), -1)::int + 1` })
        .from(banners)
      const next = last?.next ?? 0

      const [created] = await tx
        .insert(banners)
        .values({ ...this.toColumns(body), displayOrder: next })
        .returning(adminFields)

      await this.audit.log(
        {
          userId: adminId,
          action: 'create',
          resourceType: 'banner',
          resourceId: created!.id,
          changes: { title: body.title, position: body.position, isActive: body.isActive },
          ...request,
        },
        tx,
      )
      return this.withStatus(created!)
    })
  }

  async update(id: number, body: BannerBody, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: banners.id, isActive: banners.isActive })
        .from(banners)
        .where(eq(banners.id, id))
        .for('update')
      if (!existing) throw new NotFoundException('Banner não encontrado')

      // O limite só vale ao LIGAR um banner que estava desligado.
      if (body.isActive && !existing.isActive) await this.assertCanActivate(tx)

      const [updated] = await tx
        .update(banners)
        .set({ ...this.toColumns(body), updatedAt: new Date() })
        .where(eq(banners.id, id))
        .returning(adminFields)

      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'banner',
          resourceId: id,
          changes: { title: body.title, position: body.position, isActive: body.isActive },
          ...request,
        },
        tx,
      )
      return this.withStatus(updated!)
    })
  }

  async remove(id: number, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(banners)
        .where(eq(banners.id, id))
        .returning({ id: banners.id, title: banners.title })
      if (!deleted) throw new NotFoundException('Banner não encontrado')
      await this.audit.log(
        {
          userId: adminId,
          action: 'delete',
          resourceType: 'banner',
          resourceId: id,
          changes: { title: deleted.title },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  async move(id: number, direction: 'up' | 'down', adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: banners.id })
        .from(banners)
        .orderBy(asc(banners.displayOrder), asc(banners.id))
        .for('update')
      const reordered = moveInList(
        rows.map((row) => row.id),
        id,
        direction,
      )
      if (reordered === 'missing') throw new NotFoundException('Banner não encontrado')
      if (reordered === 'start') throw new BadRequestException('Banner já está na primeira posição')
      if (reordered === 'end') throw new BadRequestException('Banner já está na última posição')

      const now = new Date()
      for (const [position, bannerId] of reordered.entries()) {
        await tx
          .update(banners)
          .set({ displayOrder: position, updatedAt: now })
          .where(eq(banners.id, bannerId))
      }
      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'banner',
          resourceId: id,
          changes: { moved: direction },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  /**
   * Conta uma exibição/clique (eram as funções SQL `increment_banner_views/clicks`, SECURITY DEFINER
   * e abertas a qualquer um). Só conta banner que está no ar agora e nunca devolve se existe.
   */
  async track(id: number, counter: 'views' | 'clicks'): Promise<void> {
    const now = new Date()
    await this.db
      .update(banners)
      .set(
        counter === 'views'
          ? { totalViews: sql`${banners.totalViews} + 1` }
          : { totalClicks: sql`${banners.totalClicks} + 1` },
      )
      .where(
        and(
          eq(banners.id, id),
          eq(banners.isActive, true),
          or(isNull(banners.startDate), lte(banners.startDate, now)),
          or(isNull(banners.endDate), gte(banners.endDate, now)),
        ),
      )
  }

  // --------------------------------------------------------------------------------------------

  /** Acrescenta o status calculado (`calculate_banner_status`) e os dias até expirar. */
  private withStatus<
    T extends { start_date: Date | null; end_date: Date | null; is_active: boolean },
  >(row: T) {
    const now = new Date()
    return {
      ...row,
      computed_status: calculateBannerStatus(row.start_date, row.end_date, row.is_active, now),
      days_until_expiration: calculateDaysUntilExpiration(row.end_date, now),
    }
  }

  private toColumns(body: BannerBody) {
    return {
      title: body.title,
      subtitle: body.subtitle,
      imageUrl: body.imageUrl,
      mobileImageUrl: body.mobileImageUrl,
      linkUrl: body.linkUrl,
      linkText: body.linkText,
      device: 'both' as const,
      backgroundColor: body.backgroundColor,
      textColor: body.textColor,
      startDate: body.startDate,
      endDate: body.endDate,
      isActive: body.isActive,
      position: body.position,
    }
  }

  private async assertCanActivate(tx: Parameters<Parameters<Database['transaction']>[0]>[0]) {
    await tx.execute(sql`select pg_advisory_xact_lock(${ACTIVE_LIMIT_LOCK})`)
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(banners)
      .where(eq(banners.isActive, true))
    if ((row?.count ?? 0) >= MAX_ACTIVE_BANNERS) {
      throw new ConflictException(
        `Limite de ${MAX_ACTIVE_BANNERS} banners ativos atingido. Desative um banner antes de ativar outro.`,
      )
    }
  }
}
