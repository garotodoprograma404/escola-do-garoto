import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  affiliateAttributions,
  affiliateCoursePartnerships,
  affiliateLinks,
} from '../../database/schema/index.js'

export type AffiliateTracking = { sessionKey?: string | null; visitorKey?: string | null }

export type ResolvedAffiliateAttribution = {
  attributionId: number
  affiliateId: string
  affiliateLinkId: number
  affiliateLinkCode: string
  partnershipId: number
  courseId: number
  attributionModel: string
  attributedAt: string
  expiresAt: string
  commissionRate: number
  cookieWindowDays: number
}

/**
 * Descobre qual afiliado (se algum) trouxe cada compra: o clique mais recente, ainda dentro da
 * janela do cookie, de um link ativo de uma parceria APROVADA para aquele curso (modelo
 * `last_click`). O servidor do Next só repassa as chaves de rastreio; o que vale é o que está no
 * banco.
 *
 * O afiliado não ganha comissão da própria compra nem do curso dele (autoindicação).
 */
@Injectable()
export class AffiliateAttributionService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async resolveForCourses(
    executor: DbExecutor,
    input: {
      courseIds: number[]
      tracking: AffiliateTracking | undefined
      buyerId: string
      producerByCourse: Map<number, string>
    },
  ): Promise<Map<number, ResolvedAffiliateAttribution>> {
    const sessionKey = input.tracking?.sessionKey?.trim() || null
    const visitorKey = input.tracking?.visitorKey?.trim() || null
    const result = new Map<number, ResolvedAffiliateAttribution>()
    if (input.courseIds.length === 0 || (!sessionKey && !visitorKey)) return result

    const keys = [
      sessionKey ? eq(affiliateAttributions.sessionKey, sessionKey) : undefined,
      visitorKey ? eq(affiliateAttributions.visitorKey, visitorKey) : undefined,
    ].filter((condition) => condition !== undefined)

    const rows = await executor
      .select({
        attributionId: affiliateAttributions.id,
        affiliateId: affiliateAttributions.affiliateId,
        affiliateLinkId: affiliateAttributions.affiliateLinkId,
        courseId: affiliateAttributions.courseId,
        attributionModel: affiliateAttributions.attributionModel,
        attributedAt: affiliateAttributions.attributedAt,
        expiresAt: affiliateAttributions.expiresAt,
        linkCode: affiliateLinks.code,
        partnershipId: affiliateCoursePartnerships.id,
        commissionRate: affiliateCoursePartnerships.commissionRate,
        cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
      })
      .from(affiliateAttributions)
      .innerJoin(affiliateLinks, eq(affiliateLinks.id, affiliateAttributions.affiliateLinkId))
      .innerJoin(
        affiliateCoursePartnerships,
        eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
      )
      .where(
        and(
          or(...keys),
          inArray(affiliateAttributions.courseId, input.courseIds),
          gt(affiliateAttributions.expiresAt, new Date()),
          eq(affiliateLinks.isActive, true),
          eq(affiliateCoursePartnerships.status, 'approved'),
          // O link precisa ser deste curso e deste afiliado (nada de reaproveitar clique de outro).
          eq(affiliateCoursePartnerships.courseId, affiliateAttributions.courseId),
          eq(affiliateCoursePartnerships.affiliateId, affiliateAttributions.affiliateId),
        ),
      )
      .orderBy(desc(affiliateAttributions.attributedAt), desc(affiliateAttributions.id))

    for (const row of rows) {
      if (result.has(row.courseId)) continue // o mais recente já foi escolhido
      if (row.affiliateId === input.buyerId) continue
      if (row.affiliateId === input.producerByCourse.get(row.courseId)) continue
      result.set(row.courseId, {
        attributionId: row.attributionId,
        affiliateId: row.affiliateId,
        affiliateLinkId: row.affiliateLinkId,
        affiliateLinkCode: row.linkCode,
        partnershipId: row.partnershipId,
        courseId: row.courseId,
        attributionModel: row.attributionModel,
        attributedAt: row.attributedAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        commissionRate: row.commissionRate,
        cookieWindowDays: row.cookieWindowDays,
      })
    }
    return result
  }
}
