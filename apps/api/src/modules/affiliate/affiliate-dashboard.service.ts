import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import {
  affiliateAttributions,
  affiliateCoursePartnerships,
  affiliateLinks,
  courses,
  transactions,
} from '../../database/schema/index.js'
import { AffiliateCommissionService } from './affiliate-commission.service.js'
import {
  buildDashboardSummary,
  buildDestinationPath,
  buildShareUrl,
  hydrateLinkMetrics,
  metadataText,
  type AffiliateApprovedPartnershipOption,
  type AffiliateDashboardData,
  type ClickMetric,
  type ConversionMetric,
  type EmptyLinkItem,
} from './affiliate-dashboard.js'

/** Painel do afiliado: parcerias aprovadas, links e métricas (cliques, vendas, comissões). */
@Injectable()
export class AffiliateDashboardService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(AffiliateCommissionService) private readonly commissions: AffiliateCommissionService,
  ) {}

  async getDashboard(userId: string): Promise<AffiliateDashboardData> {
    await this.commissions.releaseEligibleCommissions(userId)

    const [partnershipRows, linkRows] = await Promise.all([
      this.db
        .select({
          id: affiliateCoursePartnerships.id,
          status: affiliateCoursePartnerships.status,
          commissionRate: affiliateCoursePartnerships.commissionRate,
          cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
          courseId: courses.id,
          courseTitle: courses.title,
          courseSlug: courses.slug,
        })
        .from(affiliateCoursePartnerships)
        .innerJoin(courses, eq(courses.id, affiliateCoursePartnerships.courseId))
        .where(eq(affiliateCoursePartnerships.affiliateId, userId))
        .orderBy(desc(affiliateCoursePartnerships.createdAt)),
      // Só os links das parcerias DESTE afiliado (nunca os de outros).
      this.db
        .select({
          id: affiliateLinks.id,
          partnershipId: affiliateLinks.partnershipId,
          code: affiliateLinks.code,
          slug: affiliateLinks.slug,
          isActive: affiliateLinks.isActive,
          metadata: affiliateLinks.metadata,
          createdAt: affiliateLinks.createdAt,
          updatedAt: affiliateLinks.updatedAt,
          commissionRate: affiliateCoursePartnerships.commissionRate,
          cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
          courseId: courses.id,
          courseTitle: courses.title,
          courseSlug: courses.slug,
        })
        .from(affiliateLinks)
        .innerJoin(
          affiliateCoursePartnerships,
          eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
        )
        .innerJoin(courses, eq(courses.id, affiliateCoursePartnerships.courseId))
        .where(eq(affiliateCoursePartnerships.affiliateId, userId))
        .orderBy(desc(affiliateLinks.createdAt)),
    ])

    const approvedPartnerships: AffiliateApprovedPartnershipOption[] = partnershipRows
      .filter((row) => row.status === 'approved')
      .map((row) => ({
        id: String(row.id),
        courseId: String(row.courseId),
        courseTitle: row.courseTitle,
        courseSlug: row.courseSlug,
        commissionRate: row.commissionRate,
        cookieWindowDays: row.cookieWindowDays,
      }))

    const emptyLinks: EmptyLinkItem[] = linkRows.map((row) => {
      const destinationPath = buildDestinationPath(row.courseSlug, row.metadata)
      return {
        id: String(row.id),
        partnershipId: String(row.partnershipId),
        courseId: String(row.courseId),
        courseTitle: row.courseTitle,
        courseSlug: row.courseSlug,
        code: row.code,
        slug: row.slug,
        isActive: row.isActive,
        campaignName: metadataText(row.metadata, 'campaign_name'),
        trafficSource: metadataText(row.metadata, 'traffic_source'),
        notes: metadataText(row.metadata, 'notes'),
        destinationPath,
        shareUrl: buildShareUrl(this.env.WEB_ORIGIN, destinationPath, row.code),
        commissionRate: row.commissionRate,
        cookieWindowDays: row.cookieWindowDays,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }
    })

    if (emptyLinks.length === 0) {
      return {
        summary: buildDashboardSummary(approvedPartnerships.length, []),
        approvedPartnerships,
        links: [],
      }
    }

    const linkIds = linkRows.map((row) => row.id)
    const [clickRows, conversionRows] = await Promise.all([
      this.db
        .select({
          linkId: affiliateAttributions.affiliateLinkId,
          clicks: sql<number>`count(*)::int`,
          lastClickAt: sql<Date | null>`max(${affiliateAttributions.attributedAt})`.mapWith(
            (value) => (value ? new Date(value as string) : null),
          ),
        })
        .from(affiliateAttributions)
        .where(
          and(
            eq(affiliateAttributions.affiliateId, userId),
            inArray(affiliateAttributions.affiliateLinkId, linkIds),
          ),
        )
        .groupBy(affiliateAttributions.affiliateLinkId),
      this.getConversionMetrics(userId),
    ])

    const clicks: ClickMetric[] = clickRows
    const links = hydrateLinkMetrics(emptyLinks, clicks, conversionRows).sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )

    return {
      summary: buildDashboardSummary(approvedPartnerships.length, links),
      approvedPartnerships,
      links,
    }
  }

  /** Comissões do afiliado agrupadas por link e status (soma em centavos, feita no banco). */
  private async getConversionMetrics(userId: string): Promise<ConversionMetric[]> {
    const linkIdText = sql<string | null>`${transactions.metadata}->>'affiliate_link_id'`
    const grossText = sql`${transactions.metadata}->>'gross_sale_amount'`

    const rows = await this.db
      .select({
        linkId: linkIdText,
        status: transactions.status,
        count: sql<number>`count(*)::int`,
        amountCents: sql<string>`coalesce(sum(round(abs(${transactions.amount}) * 100)), 0)::text`,
        grossSaleCents: sql<string>`coalesce(sum(case when ${grossText} ~ '^[0-9]+(\.[0-9]+)?$' then round((${grossText})::numeric * 100) else 0 end), 0)::text`,
        lastAt: sql<string | null>`max(${transactions.createdAt})`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'affiliate_commission')))
      .groupBy(linkIdText, transactions.status)

    return rows
      .filter((row) => row.linkId !== null && /^\d+$/.test(row.linkId))
      .map((row) => ({
        linkId: Number(row.linkId),
        status: row.status,
        count: row.count,
        amountCents: Number(row.amountCents),
        grossSaleCents: Number(row.grossSaleCents),
        lastAt: row.lastAt ? new Date(row.lastAt) : null,
      }))
  }
}
