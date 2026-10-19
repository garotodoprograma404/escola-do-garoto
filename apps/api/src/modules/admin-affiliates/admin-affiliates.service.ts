import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, desc, eq, inArray, isNull, sql, type SQLWrapper } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import {
  affiliateApplications,
  affiliateCoursePartnerships,
  affiliateLinks,
  courses,
  profiles,
  transactions,
  userRoles,
  users,
} from '../../database/schema/index.js'
import { AuditService, type AuditEntry } from '../audit/audit.service.js'
import { AffiliateCommissionService } from '../affiliate/affiliate-commission.service.js'
import { centsToReais, reaisToCents } from '../affiliate/affiliate-money.js'
import type {
  ReviewApplicationInput,
  ReviewPartnershipInput,
  UpsertPartnershipInput,
} from './admin-affiliates.schemas.js'
import type {
  AffiliateAdminDashboardData,
  AffiliateAdminListItem,
  AffiliateApplicationListItem,
  AffiliateCourseOption,
  AffiliateOption,
  AffiliatePartnershipListItem,
  AffiliateSalesAuditRow,
} from './admin-affiliates.types.js'

/** Quantas vendas aparecem na tabela de auditoria (as mais recentes). Os totais usam TODAS. */
const SALES_AUDIT_LIMIT = 200

/** De onde veio a ação (vai para a trilha de auditoria). */
export type AdminClient = { ipAddress?: string | null; userAgent?: string | null }

function asString(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
  return text.trim() || fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function profileName(profile?: { displayName: string | null; fullName: string } | null): string {
  if (!profile) return 'Usuário desconhecido'
  return profile.displayName || profile.fullName || 'Usuário desconhecido'
}

function count<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by)
}

/** Administração do programa de afiliados. Só admin (o controller exige o papel). */
@Injectable()
export class AdminAffiliatesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(AffiliateCommissionService) private readonly commissions: AffiliateCommissionService,
  ) {}

  async getDashboard(): Promise<AffiliateAdminDashboardData> {
    await this.commissions.releaseEligibleCommissions()

    const db = this.db
    const cents = (column: SQLWrapper) =>
      sql<string>`coalesce(sum(round(abs(${column}) * 100)), 0)::text`

    const [
      roleRows,
      applicationRows,
      partnershipRows,
      linkCountRows,
      commissionAggRows,
      salesRows,
      [salesTotals],
      courseRows,
    ] = await Promise.all([
      db
        .select({
          userId: userRoles.userId,
          isActive: userRoles.isActive,
          revokedAt: userRoles.revokedAt,
        })
        .from(userRoles)
        .where(eq(userRoles.role, 'affiliate')),
      db
        .select({
          id: affiliateApplications.id,
          userId: affiliateApplications.userId,
          fullName: affiliateApplications.fullName,
          email: affiliateApplications.email,
          phone: affiliateApplications.phone,
          instagramHandle: affiliateApplications.instagramHandle,
          youtubeChannel: affiliateApplications.youtubeChannel,
          websiteUrl: affiliateApplications.websiteUrl,
          audienceSize: affiliateApplications.audienceSize,
          audienceSummary: affiliateApplications.audienceSummary,
          promotionChannels: affiliateApplications.promotionChannels,
          experienceSummary: affiliateApplications.experienceSummary,
          whyAffiliate: affiliateApplications.whyAffiliate,
          status: affiliateApplications.status,
          rejectionReason: affiliateApplications.rejectionReason,
          notes: affiliateApplications.notes,
          reviewedAt: affiliateApplications.reviewedAt,
          reviewedBy: affiliateApplications.reviewedBy,
          createdAt: affiliateApplications.createdAt,
        })
        .from(affiliateApplications)
        .orderBy(desc(affiliateApplications.createdAt)),
      db
        .select({
          id: affiliateCoursePartnerships.id,
          affiliateId: affiliateCoursePartnerships.affiliateId,
          courseId: affiliateCoursePartnerships.courseId,
          status: affiliateCoursePartnerships.status,
          commissionRate: affiliateCoursePartnerships.commissionRate,
          cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
          createdAt: affiliateCoursePartnerships.createdAt,
          approvedAt: affiliateCoursePartnerships.approvedAt,
          reviewedAt: affiliateCoursePartnerships.reviewedAt,
          rejectionReason: affiliateCoursePartnerships.rejectionReason,
          notes: affiliateCoursePartnerships.notes,
        })
        .from(affiliateCoursePartnerships)
        .orderBy(desc(affiliateCoursePartnerships.createdAt)),
      db
        .select({ partnershipId: affiliateLinks.partnershipId, total: sql<number>`count(*)::int` })
        .from(affiliateLinks)
        .groupBy(affiliateLinks.partnershipId),
      db
        .select({
          userId: transactions.userId,
          total: sql<number>`count(*)::int`,
          allCents: cents(transactions.amount),
          pendingCents: sql<string>`coalesce(sum(case when ${transactions.status} = 'pending' then round(abs(${transactions.amount}) * 100) else 0 end), 0)::text`,
          completedCents: sql<string>`coalesce(sum(case when ${transactions.status} = 'completed' then round(abs(${transactions.amount}) * 100) else 0 end), 0)::text`,
        })
        .from(transactions)
        .where(eq(transactions.type, 'affiliate_commission'))
        .groupBy(transactions.userId),
      db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          amount: transactions.amount,
          status: transactions.status,
          paymentId: transactions.paymentId,
          createdAt: transactions.createdAt,
          metadata: transactions.metadata,
        })
        .from(transactions)
        .where(eq(transactions.type, 'affiliate_commission'))
        .orderBy(desc(transactions.createdAt))
        .limit(SALES_AUDIT_LIMIT),
      db
        .select({ total: sql<number>`count(*)::int`, cents: cents(transactions.amount) })
        .from(transactions)
        .where(eq(transactions.type, 'affiliate_commission')),
      db
        .select({ id: courses.id, title: courses.title, producerId: courses.producerId })
        .from(courses)
        .where(eq(courses.status, 'approved'))
        .orderBy(courses.title),
    ])

    const affiliateIds = [...new Set(roleRows.map((row) => row.userId))]
    const salesProducerIds = salesRows
      .map((row) => (isRecord(row.metadata) ? asString(row.metadata.producer_id) : ''))
      .filter(Boolean)
    const knownUserIds = [
      ...new Set([
        ...affiliateIds,
        ...partnershipRows.map((row) => row.affiliateId),
        ...courseRows.map((row) => row.producerId),
        ...salesRows.map((row) => row.userId),
        ...salesProducerIds,
      ]),
    ]

    const [profileRows, emailRows] = knownUserIds.length
      ? await Promise.all([
          db
            .select({
              id: profiles.id,
              fullName: profiles.fullName,
              displayName: profiles.displayName,
            })
            .from(profiles)
            .where(inArray(profiles.id, knownUserIds)),
          // O e-mail vem direto da tabela de usuários.
          db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(
              inArray(users.id, [
                ...new Set([...affiliateIds, ...partnershipRows.map((row) => row.affiliateId)]),
              ]),
            ),
        ])
      : [[], []]

    const profileById = new Map(profileRows.map((row) => [row.id, row]))
    const emailById = new Map(emailRows.map((row) => [row.id, row.email]))
    const courseById = new Map(courseRows.map((row) => [row.id, row]))
    const linksByPartnership = new Map(linkCountRows.map((row) => [row.partnershipId, row.total]))
    const aggByUser = new Map(commissionAggRows.map((row) => [row.userId, row]))

    const partnershipCount = new Map<string, number>()
    const approvedPartnershipCount = new Map<string, number>()
    for (const partnership of partnershipRows) {
      count(partnershipCount, partnership.affiliateId)
      if (partnership.status === 'approved')
        count(approvedPartnershipCount, partnership.affiliateId)
    }

    const affiliates: AffiliateAdminListItem[] = affiliateIds
      .map((affiliateId) => {
        const agg = aggByUser.get(affiliateId)
        return {
          affiliateId,
          name: profileName(profileById.get(affiliateId)),
          email: emailById.get(affiliateId) ?? '',
          partnershipCount: partnershipCount.get(affiliateId) ?? 0,
          approvedPartnershipCount: approvedPartnershipCount.get(affiliateId) ?? 0,
          trackedSalesCount: agg?.total ?? 0,
          totalCommission: centsToReais(Number(agg?.allCents ?? 0)),
          pendingCommission: centsToReais(Number(agg?.pendingCents ?? 0)),
          availableCommission: centsToReais(Number(agg?.completedCents ?? 0)),
        }
      })
      .sort((left, right) => right.totalCommission - left.totalCommission)
    const affiliateById = new Map(affiliates.map((item) => [item.affiliateId, item]))

    const affiliateOptions: AffiliateOption[] = affiliates
      .map((item) => ({ id: item.affiliateId, name: item.name, email: item.email }))
      .sort((left, right) => left.name.localeCompare(right.name))

    const courseOptions: AffiliateCourseOption[] = courseRows.map((course) => ({
      id: String(course.id),
      title: course.title,
      producerId: course.producerId,
      producerName: profileName(profileById.get(course.producerId)),
    }))

    const partnerships: AffiliatePartnershipListItem[] = partnershipRows.map((partnership) => {
      const affiliate = affiliateById.get(partnership.affiliateId)
      const course = courseById.get(partnership.courseId)
      return {
        id: String(partnership.id),
        affiliateId: partnership.affiliateId,
        affiliateName: affiliate?.name || profileName(profileById.get(partnership.affiliateId)),
        affiliateEmail: affiliate?.email || emailById.get(partnership.affiliateId) || '',
        courseId: String(partnership.courseId),
        courseTitle: course?.title || `Curso #${partnership.courseId}`,
        producerId: course?.producerId || '',
        producerName: profileName(course ? profileById.get(course.producerId) : null),
        status: partnership.status,
        commissionRate: partnership.commissionRate,
        cookieWindowDays: partnership.cookieWindowDays,
        linksCount: linksByPartnership.get(partnership.id) ?? 0,
        createdAt: partnership.createdAt.toISOString(),
        approvedAt: partnership.approvedAt?.toISOString() ?? null,
        reviewedAt: partnership.reviewedAt?.toISOString() ?? null,
        rejectionReason: partnership.rejectionReason,
        notes: partnership.notes,
      }
    })

    const salesAudit: AffiliateSalesAuditRow[] = salesRows.map((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {}
      const producerId = asString(metadata.producer_id)
      return {
        transactionId: String(row.id),
        affiliateId: row.userId,
        affiliateName:
          affiliateById.get(row.userId)?.name || profileName(profileById.get(row.userId)),
        courseId: asString(metadata.course_id),
        courseTitle: asString(metadata.course_title, 'Curso não identificado'),
        producerId,
        producerName: profileName(profileById.get(producerId)),
        orderId: asString(metadata.order_id),
        orderPublicId: asString(metadata.order_public_id),
        orderItemId: metadata.order_item_id ? asString(metadata.order_item_id) : null,
        paymentId: asString(row.paymentId),
        amount: centsToReais(reaisToCents(Math.max(0, row.amount))),
        status: row.status,
        affiliateLinkCode: metadata.affiliate_link_code
          ? asString(metadata.affiliate_link_code)
          : null,
        attributedAt: metadata.attributed_at ? asString(metadata.attributed_at) : null,
        createdAt: row.createdAt.toISOString(),
      }
    })

    const activeRoleUserIds = new Set(
      roleRows.filter((row) => row.isActive && !row.revokedAt).map((row) => row.userId),
    )

    const applications: AffiliateApplicationListItem[] = applicationRows.map((application) => ({
      id: String(application.id),
      userId: application.userId,
      fullName: asString(application.fullName, 'Sem nome'),
      email: asString(application.email),
      phone: asString(application.phone),
      instagramHandle: asString(application.instagramHandle) || null,
      youtubeChannel: asString(application.youtubeChannel) || null,
      websiteUrl: asString(application.websiteUrl) || null,
      audienceSize: asString(application.audienceSize) || null,
      audienceSummary: asString(application.audienceSummary),
      promotionChannels: application.promotionChannels
        .map((item) => asString(item))
        .filter(Boolean),
      experienceSummary: asString(application.experienceSummary),
      whyAffiliate: asString(application.whyAffiliate),
      status: application.status,
      rejectionReason: asString(application.rejectionReason) || null,
      notes: asString(application.notes) || null,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      reviewedBy: application.reviewedBy,
      createdAt: application.createdAt.toISOString(),
      hasAffiliateRole: activeRoleUserIds.has(application.userId),
      partnershipCount: partnershipCount.get(application.userId) ?? 0,
      approvedPartnershipCount: approvedPartnershipCount.get(application.userId) ?? 0,
    }))

    return {
      stats: {
        totalAffiliates: affiliates.length,
        activeAffiliates: activeRoleUserIds.size,
        pendingApplications: applications.filter(
          (item) => item.status === 'pending' || item.status === 'under_review',
        ).length,
        pendingPartnerships: partnerships.filter((item) => item.status === 'pending').length,
        approvedPartnerships: partnerships.filter((item) => item.status === 'approved').length,
        trackedSales: salesTotals?.total ?? 0,
        affiliateCommissionTotal: centsToReais(Number(salesTotals?.cents ?? 0)),
      },
      applications,
      affiliates,
      partnerships,
      salesAudit,
      affiliateOptions,
      courseOptions,
    }
  }

  private auditEntry(
    admin: SessionUser,
    client: AdminClient,
    entry: Omit<AuditEntry, 'userId' | 'ipAddress' | 'userAgent'>,
  ): AuditEntry {
    return { ...entry, userId: admin.id, ipAddress: client.ipAddress, userAgent: client.userAgent }
  }

  /**
   * Revisa uma candidatura. Aprovar concede o papel `affiliate` (e pode criar a primeira parceria);
   * tirar uma candidatura que estava aprovada revoga o papel e as parcerias aprovadas.
   * Tudo numa transação, para que os passos nunca fiquem pela metade.
   */
  async reviewApplication(
    admin: SessionUser,
    applicationId: number,
    input: ReviewApplicationInput,
    client: AdminClient,
  ): Promise<{ success: true }> {
    return this.db.transaction(async (tx) => {
      const [application] = await tx
        .select({
          id: affiliateApplications.id,
          userId: affiliateApplications.userId,
          status: affiliateApplications.status,
        })
        .from(affiliateApplications)
        .where(eq(affiliateApplications.id, applicationId))
        .for('update')
      if (!application) throw new NotFoundException('Candidatura não encontrada')

      const now = new Date()

      if (input.status === 'approved') {
        await tx
          .insert(userRoles)
          .values({
            userId: application.userId,
            role: 'affiliate',
            isActive: true,
            grantedAt: now,
            grantedBy: admin.id,
            revokedAt: null,
            revokedBy: null,
          })
          .onConflictDoUpdate({
            target: [userRoles.userId, userRoles.role],
            set: {
              isActive: true,
              grantedAt: now,
              grantedBy: admin.id,
              revokedAt: null,
              revokedBy: null,
            },
          })

        if (input.partnershipCourseId) {
          const [course] = await tx
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.id, input.partnershipCourseId))
          if (!course) throw new NotFoundException('Curso não encontrado')

          const values = {
            commissionRate: input.partnershipCommissionRate!,
            cookieWindowDays: input.partnershipCookieWindowDays ?? 30,
            notes: input.partnershipNotes || null,
            status: 'approved' as const,
            rejectionReason: null,
            approvedAt: now,
            approvedBy: admin.id,
            reviewedAt: now,
            reviewedBy: admin.id,
          }
          await tx
            .insert(affiliateCoursePartnerships)
            .values({
              affiliateId: application.userId,
              courseId: input.partnershipCourseId,
              ...values,
            })
            .onConflictDoUpdate({
              target: [
                affiliateCoursePartnerships.affiliateId,
                affiliateCoursePartnerships.courseId,
              ],
              set: values,
            })
        }
      } else if (application.status === 'approved') {
        await tx
          .update(userRoles)
          .set({ isActive: false, revokedAt: now, revokedBy: admin.id })
          .where(
            and(
              eq(userRoles.userId, application.userId),
              eq(userRoles.role, 'affiliate'),
              eq(userRoles.isActive, true),
              isNull(userRoles.revokedAt),
            ),
          )
        await tx
          .update(affiliateCoursePartnerships)
          .set({
            status: 'revoked',
            reviewedAt: now,
            reviewedBy: admin.id,
            rejectionReason:
              input.status === 'rejected'
                ? input.rejectionReason || 'Candidatura rejeitada pelo time.'
                : 'Candidatura retornou para revisão interna.',
          })
          .where(
            and(
              eq(affiliateCoursePartnerships.affiliateId, application.userId),
              eq(affiliateCoursePartnerships.status, 'approved'),
            ),
          )
      }

      const reviewed = input.status !== 'pending'
      await tx
        .update(affiliateApplications)
        .set({
          status: input.status,
          rejectionReason: input.status === 'rejected' ? input.rejectionReason || null : null,
          notes: input.notes || null,
          reviewedAt: reviewed ? now : null,
          reviewedBy: reviewed ? admin.id : null,
        })
        .where(eq(affiliateApplications.id, applicationId))

      await this.audit.log(
        this.auditEntry(admin, client, {
          action:
            input.status === 'approved'
              ? 'approve'
              : input.status === 'rejected'
                ? 'reject'
                : 'update',
          resourceType: 'affiliate_application',
          resourceId: applicationId,
          changes: { status: { from: application.status, to: input.status } },
          metadata: {
            applicant_id: application.userId,
            partnership_course_id: input.partnershipCourseId ?? null,
          },
        }),
        tx,
      )
      return { success: true as const }
    })
  }

  /** Cria ou atualiza uma parceria afiliado × curso (comissão, janela de cookie e status). */
  async upsertPartnership(
    admin: SessionUser,
    input: UpsertPartnershipInput,
    client: AdminClient,
  ): Promise<{ success: true; id: number }> {
    const now = new Date()
    const reviewed =
      input.status === 'approved' || input.status === 'rejected' || input.status === 'revoked'
    const payload = {
      affiliateId: input.affiliateId,
      courseId: input.courseId,
      commissionRate: input.commissionRate,
      cookieWindowDays: input.cookieWindowDays,
      notes: input.notes || null,
      status: input.status,
      rejectionReason: input.status === 'rejected' ? input.rejectionReason || null : null,
      approvedAt: input.status === 'approved' ? now : null,
      approvedBy: input.status === 'approved' ? admin.id : null,
      reviewedAt: reviewed ? now : null,
      reviewedBy: reviewed ? admin.id : null,
    }

    try {
      return await this.db.transaction(async (tx) => {
        const [[affiliateProfile], [course]] = await Promise.all([
          tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, input.affiliateId)),
          tx.select({ id: courses.id }).from(courses).where(eq(courses.id, input.courseId)),
        ])
        if (!affiliateProfile) throw new NotFoundException('Afiliado não encontrado')
        if (!course) throw new NotFoundException('Curso não encontrado')

        if (input.partnershipId) {
          // Editar não pode "mover" a parceria (e seus links/cliques) para outro afiliado ou curso.
          const [current] = await tx
            .select({
              affiliateId: affiliateCoursePartnerships.affiliateId,
              courseId: affiliateCoursePartnerships.courseId,
            })
            .from(affiliateCoursePartnerships)
            .where(eq(affiliateCoursePartnerships.id, input.partnershipId))
          if (!current) throw new NotFoundException('Parceria não encontrada')
          if (current.affiliateId !== input.affiliateId || current.courseId !== input.courseId) {
            throw new BadRequestException(
              'Não é possível trocar o afiliado ou o curso de uma parceria',
            )
          }
        } else {
          const [role] = await tx
            .select({ id: userRoles.id })
            .from(userRoles)
            .where(
              and(
                eq(userRoles.userId, input.affiliateId),
                eq(userRoles.role, 'affiliate'),
                eq(userRoles.isActive, true),
                isNull(userRoles.revokedAt),
              ),
            )
          if (!role) throw new BadRequestException('Este usuário não é afiliado')
        }

        let id: number
        let created = false
        if (input.partnershipId) {
          const [updated] = await tx
            .update(affiliateCoursePartnerships)
            .set(payload)
            .where(eq(affiliateCoursePartnerships.id, input.partnershipId))
            .returning({ id: affiliateCoursePartnerships.id })
          if (!updated) throw new NotFoundException('Parceria não encontrada')
          id = updated.id
        } else {
          const [existing] = await tx
            .select({ id: affiliateCoursePartnerships.id })
            .from(affiliateCoursePartnerships)
            .where(
              and(
                eq(affiliateCoursePartnerships.affiliateId, input.affiliateId),
                eq(affiliateCoursePartnerships.courseId, input.courseId),
              ),
            )
            .for('update')
          created = !existing
          const [saved] = await tx
            .insert(affiliateCoursePartnerships)
            .values(payload)
            .onConflictDoUpdate({
              target: [
                affiliateCoursePartnerships.affiliateId,
                affiliateCoursePartnerships.courseId,
              ],
              set: payload,
            })
            .returning({ id: affiliateCoursePartnerships.id })
          id = saved!.id
        }

        await this.audit.log(
          this.auditEntry(admin, client, {
            action: created ? 'create' : partnershipAuditAction(input.status),
            resourceType: 'affiliate_partnership',
            resourceId: id,
            changes: {
              status: input.status,
              commission_rate: input.commissionRate,
              cookie_window_days: input.cookieWindowDays,
            },
            metadata: { affiliate_id: input.affiliateId, course_id: input.courseId },
          }),
          tx,
        )
        return { success: true as const, id }
      })
    } catch (error) {
      // Trocar afiliado/curso de uma parceria para um par que já existe.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma parceria deste afiliado com este curso')
      }
      throw error
    }
  }

  /** Aprova, rejeita ou revoga uma parceria existente. */
  async reviewPartnership(
    admin: SessionUser,
    partnershipId: number,
    input: ReviewPartnershipInput,
    client: AdminClient,
  ): Promise<{ success: true }> {
    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(affiliateCoursePartnerships)
        .set({
          status: input.status,
          rejectionReason: input.status === 'rejected' ? input.rejectionReason || null : null,
          approvedAt: input.status === 'approved' ? now : null,
          approvedBy: input.status === 'approved' ? admin.id : null,
          reviewedAt: now,
          reviewedBy: admin.id,
        })
        .where(eq(affiliateCoursePartnerships.id, partnershipId))
        .returning({
          id: affiliateCoursePartnerships.id,
          affiliateId: affiliateCoursePartnerships.affiliateId,
          courseId: affiliateCoursePartnerships.courseId,
        })
      if (!updated) throw new NotFoundException('Parceria não encontrada')

      await this.audit.log(
        this.auditEntry(admin, client, {
          action: partnershipAuditAction(input.status),
          resourceType: 'affiliate_partnership',
          resourceId: partnershipId,
          changes: { status: input.status },
          metadata: { affiliate_id: updated.affiliateId, course_id: updated.courseId },
        }),
        tx,
      )
      return { success: true as const }
    })
  }
}

function partnershipAuditAction(status: UpsertPartnershipInput['status']): AuditEntry['action'] {
  if (status === 'approved') return 'approve'
  if (status === 'rejected') return 'reject'
  if (status === 'revoked') return 'deactivate'
  return 'update'
}
