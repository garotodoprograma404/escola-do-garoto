import { ConflictException, Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import { affiliateApplications, profiles, userRoles } from '../../database/schema/index.js'
import type { SubmitApplicationInput } from './affiliate.schemas.js'

/**
 * Candidatura como o candidato a vê (snake_case, o formato que o front consome).
 * Fora de propósito: `notes` (anotação interna do admin), `metadata` e `reviewed_by`.
 */
type OwnAffiliateApplication = {
  id: number
  user_id: string
  full_name: string
  email: string
  phone: string
  instagram_handle: string | null
  youtube_channel: string | null
  website_url: string | null
  audience_size: string | null
  audience_summary: string
  promotion_channels: string[]
  experience_summary: string
  why_affiliate: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type AffiliateApplicationLandingData = {
  application: OwnAffiliateApplication | null
  profile: { fullName: string | null; phone: string | null } | null
}

const EXISTING_APPLICATION_MESSAGES = {
  pending: 'Você já possui uma candidatura pendente.',
  under_review: 'Sua candidatura já está em análise.',
  approved: 'Sua candidatura já foi aprovada. Aguarde a liberação do acesso.',
  rejected: 'Já existe uma candidatura registrada para sua conta.',
} as const

/** Candidatura ao programa de afiliados (qualquer pessoa logada, só a própria). */
@Injectable()
export class AffiliateApplicationService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getLandingData(userId: string): Promise<AffiliateApplicationLandingData> {
    const [[application], [profile]] = await Promise.all([
      this.db
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
          reviewedAt: affiliateApplications.reviewedAt,
          rejectionReason: affiliateApplications.rejectionReason,
          createdAt: affiliateApplications.createdAt,
          updatedAt: affiliateApplications.updatedAt,
        })
        .from(affiliateApplications)
        .where(eq(affiliateApplications.userId, userId)),
      this.db
        .select({ fullName: profiles.fullName, phone: profiles.phone })
        .from(profiles)
        .where(eq(profiles.id, userId)),
    ])

    return {
      application: application
        ? {
            id: application.id,
            user_id: application.userId,
            full_name: application.fullName,
            email: application.email,
            phone: application.phone,
            instagram_handle: application.instagramHandle,
            youtube_channel: application.youtubeChannel,
            website_url: application.websiteUrl,
            audience_size: application.audienceSize,
            audience_summary: application.audienceSummary,
            promotion_channels: application.promotionChannels.filter(Boolean),
            experience_summary: application.experienceSummary,
            why_affiliate: application.whyAffiliate,
            status: application.status,
            reviewed_at: application.reviewedAt?.toISOString() ?? null,
            rejection_reason: application.rejectionReason,
            created_at: application.createdAt.toISOString(),
            updated_at: application.updatedAt.toISOString(),
          }
        : null,
      profile: profile ? { fullName: profile.fullName, phone: profile.phone } : null,
    }
  }

  async submit(userId: string, input: SubmitApplicationInput): Promise<{ success: true }> {
    return this.db.transaction(async (tx) => {
      const [[existingRole], [existingApplication]] = await Promise.all([
        tx
          .select({ id: userRoles.id })
          .from(userRoles)
          .where(
            and(
              eq(userRoles.userId, userId),
              eq(userRoles.role, 'affiliate'),
              eq(userRoles.isActive, true),
              isNull(userRoles.revokedAt),
            ),
          ),
        tx
          .select({ status: affiliateApplications.status })
          .from(affiliateApplications)
          .where(eq(affiliateApplications.userId, userId)),
      ])

      if (existingRole) {
        throw new ConflictException('Sua conta já possui acesso ao programa de afiliados.')
      }
      if (existingApplication) {
        throw new ConflictException(EXISTING_APPLICATION_MESSAGES[existingApplication.status])
      }

      try {
        await tx.insert(affiliateApplications).values({
          userId,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          instagramHandle: input.instagramHandle ?? null,
          youtubeChannel: input.youtubeChannel ?? null,
          websiteUrl: input.websiteUrl ?? null,
          audienceSize: input.audienceSize ?? null,
          audienceSummary: input.audienceSummary,
          promotionChannels: input.promotionChannels,
          experienceSummary: input.experienceSummary,
          whyAffiliate: input.whyAffiliate,
        })
      } catch (error) {
        // Dois envios ao mesmo tempo: o índice único (um por pessoa) segura o segundo.
        if (isUniqueViolation(error)) {
          throw new ConflictException(EXISTING_APPLICATION_MESSAGES.pending)
        }
        throw error
      }

      // O nome e o telefone informados também atualizam o perfil.
      await tx
        .update(profiles)
        .set({ fullName: input.fullName, phone: input.phone })
        .where(eq(profiles.id, userId))

      return { success: true as const }
    })
  }
}
