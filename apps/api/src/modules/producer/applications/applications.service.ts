import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { desc, eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { producerApplications, profiles, userRoles } from '../../../database/schema/index.js'
import { AuditService } from '../../audit/audit.service.js'
import { slugify } from '../profile/slug.js'
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  ReviewApplicationInput,
} from './applications.schemas.js'

/** Comissão padrão da plataforma para produtor novo. */
const DEFAULT_PLATFORM_COMMISSION_RATE = 10
const MAX_LIST = 300

/** O que o candidato vê da própria candidatura (sem dados de quem analisou). */
const ownColumns = {
  id: producerApplications.id,
  status: producerApplications.status,
  rejectionReason: producerApplications.rejectionReason,
  reviewedAt: producerApplications.reviewedAt,
  createdAt: producerApplications.createdAt,
  updatedAt: producerApplications.updatedAt,
}

/** O que o admin vê: tudo da candidatura (inclui CPF, por isso só a rota de admin usa). */
const adminColumns = {
  id: producerApplications.id,
  userId: producerApplications.userId,
  fullName: producerApplications.fullName,
  email: producerApplications.email,
  phone: producerApplications.phone,
  cpf: producerApplications.cpf,
  expertiseArea: producerApplications.expertiseArea,
  experienceYears: producerApplications.experienceYears,
  bio: producerApplications.bio,
  portfolioUrl: producerApplications.portfolioUrl,
  socialLinks: producerApplications.socialLinks,
  whyProduce: producerApplications.whyProduce,
  status: producerApplications.status,
  reviewedBy: producerApplications.reviewedBy,
  reviewedAt: producerApplications.reviewedAt,
  rejectionReason: producerApplications.rejectionReason,
  createdAt: producerApplications.createdAt,
  updatedAt: producerApplications.updatedAt,
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null
  return e?.code === '23505' || e?.cause?.code === '23505'
}

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Candidatura de quem está logado. O dono é SEMPRE o usuário da sessão. Uma por pessoa: em
   * análise ou aprovada bloqueia; recusada pode tentar de novo (reaproveita a mesma linha).
   */
  async submitApplication(user: SessionUser, input: CreateApplicationInput) {
    if (user.roles.includes('producer')) {
      throw new ConflictException('Você já é um produtor aprovado')
    }

    const values = {
      fullName: input.name,
      // Sempre o e-mail da conta: a equipe nunca contata um endereço escolhido por quem se candidata.
      email: user.email,
      phone: input.phone,
      cpf: input.cpf,
      expertiseArea: input.expertiseArea,
      experienceYears: input.experienceYears,
      bio: input.bio,
      portfolioUrl: input.portfolioUrl || null,
      socialLinks: input.socialLinks ?? null,
      whyProduce: input.whyProduce,
    }

    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: producerApplications.id, status: producerApplications.status })
          .from(producerApplications)
          .where(eq(producerApplications.userId, user.id))
          .for('update')

        if (existing?.status === 'pending' || existing?.status === 'under_review') {
          throw new ConflictException('Você já possui uma aplicação em análise')
        }
        if (existing?.status === 'approved') {
          throw new ConflictException('Você já é um produtor aprovado')
        }

        if (existing) {
          const [again] = await tx
            .update(producerApplications)
            .set({
              ...values,
              status: 'pending',
              reviewedBy: null,
              reviewedAt: null,
              rejectionReason: null,
              updatedAt: new Date(),
            })
            .where(eq(producerApplications.id, existing.id))
            .returning(ownColumns)
          return again
        }

        const [created] = await tx
          .insert(producerApplications)
          .values({ userId: user.id, ...values, status: 'pending' })
          .returning(ownColumns)
        return created
      })
    } catch (error) {
      // Dois envios simultâneos da mesma pessoa: o segundo bate na unicidade de `user_id`.
      if (isUniqueViolation(error)) {
        throw new ConflictException('Você já possui uma aplicação em análise')
      }
      throw error
    }
  }

  async getOwnApplication(userId: string) {
    const [application] = await this.db
      .select(ownColumns)
      .from(producerApplications)
      .where(eq(producerApplications.userId, userId))
    return { application: application ?? null }
  }

  async listApplications(query: ListApplicationsQuery) {
    return this.db
      .select(adminColumns)
      .from(producerApplications)
      .where(query.status ? eq(producerApplications.status, query.status) : undefined)
      .orderBy(desc(producerApplications.createdAt), desc(producerApplications.id))
      .limit(MAX_LIST)
  }

  /**
   * Admin aprova ou recusa. Aprovar, na MESMA transação: marca a candidatura, monta o perfil de
   * produtor, concede (ou reativa) o papel `producer` em `user_roles` e registra na auditoria.
   * Candidatura já analisada não muda de novo (evita aprovar duas vezes ou desfazer sem querer).
   */
  async reviewApplication(
    adminId: string,
    applicationId: number,
    input: ReviewApplicationInput,
    client: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    return this.db.transaction(async (tx) => {
      const [application] = await tx
        .select({
          id: producerApplications.id,
          userId: producerApplications.userId,
          fullName: producerApplications.fullName,
          bio: producerApplications.bio,
          expertiseArea: producerApplications.expertiseArea,
          socialLinks: producerApplications.socialLinks,
          status: producerApplications.status,
        })
        .from(producerApplications)
        .where(eq(producerApplications.id, applicationId))
        .for('update')
      if (!application) throw new NotFoundException('Candidatura não encontrada')
      if (application.status !== 'pending' && application.status !== 'under_review') {
        throw new ConflictException('Esta candidatura já foi analisada')
      }

      const approved = input.decision === 'approved'
      const now = new Date()
      const [updated] = await tx
        .update(producerApplications)
        .set({
          status: approved ? 'approved' : 'rejected',
          reviewedBy: adminId,
          reviewedAt: now,
          rejectionReason: approved ? null : input.rejectionReason,
          updatedAt: now,
        })
        .where(eq(producerApplications.id, applicationId))
        .returning(adminColumns)

      if (approved) {
        const [profile] = await tx
          .select({ slug: profiles.slug })
          .from(profiles)
          .where(eq(profiles.id, application.userId))
        // O slug é endereço público: só nasce se ainda não existe (nunca troca um já divulgado).
        const slug =
          profile?.slug ??
          `${slugify(application.fullName) || 'instrutor'}-${application.userId.slice(0, 8)}`

        await tx
          .update(profiles)
          .set({
            displayName: application.fullName,
            slug,
            bio: application.bio,
            expertiseAreas: [application.expertiseArea],
            socialLinks: application.socialLinks,
            commissionRate: DEFAULT_PLATFORM_COMMISSION_RATE,
            isActive: true,
            isVerified: true,
            updatedAt: now,
          })
          .where(eq(profiles.id, application.userId))

        await tx
          .insert(userRoles)
          .values({ userId: application.userId, role: 'producer', grantedBy: adminId })
          .onConflictDoUpdate({
            target: [userRoles.userId, userRoles.role],
            set: {
              isActive: true,
              revokedAt: null,
              revokedBy: null,
              grantedBy: adminId,
              grantedAt: sql`now()`,
              updatedAt: now,
            },
          })
      }

      await this.audit.log(
        {
          userId: adminId,
          action: approved ? 'approve' : 'reject',
          resourceType: 'producer_application',
          resourceId: applicationId,
          changes: { status: { from: application.status, to: updated.status } },
          metadata: { applicantId: application.userId },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
        },
        tx,
      )
      return updated
    })
  }
}
