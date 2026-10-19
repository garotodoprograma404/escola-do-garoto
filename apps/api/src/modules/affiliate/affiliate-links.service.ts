import { randomBytes } from 'node:crypto'
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import {
  affiliateCoursePartnerships,
  affiliateLinks,
  courses,
} from '../../database/schema/index.js'
import type { UpsertLinkInput } from './affiliate.schemas.js'

const CODE_ATTEMPTS = 6

/** "Black Friday!" → "black-friday". */
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/** Nome da constraint violada (o Drizzle embrulha o erro do driver em `cause`). */
function violatedConstraint(error: unknown): string | undefined {
  const read = (e: unknown) => (e as { constraint?: unknown } | null)?.constraint
  const constraint = read(error) ?? read((error as { cause?: unknown } | null)?.cause)
  return typeof constraint === 'string' ? constraint : undefined
}

const SLUG_CONFLICT_MESSAGE = 'Já existe um link com este nome de campanha. Escolha outro nome.'

/** Links rastreáveis do afiliado. Tudo filtrado pelo `userId` da sessão. */
@Injectable()
export class AffiliateLinksService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Parceria aprovada DESTE afiliado (e o slug do curso, usado no código do link). */
  private async getApprovedPartnership(userId: string, partnershipId: number) {
    const [partnership] = await this.db
      .select({
        id: affiliateCoursePartnerships.id,
        courseSlug: courses.slug,
      })
      .from(affiliateCoursePartnerships)
      .innerJoin(courses, eq(courses.id, affiliateCoursePartnerships.courseId))
      .where(
        and(
          eq(affiliateCoursePartnerships.id, partnershipId),
          eq(affiliateCoursePartnerships.affiliateId, userId),
          eq(affiliateCoursePartnerships.status, 'approved'),
        ),
      )
    if (!partnership) {
      throw new NotFoundException('Parceria aprovada não encontrada para este afiliado')
    }
    return partnership
  }

  /** Link de uma parceria aprovada deste afiliado. */
  private async ensureOwnLink(userId: string, linkId: number) {
    const [link] = await this.db
      .select({ id: affiliateLinks.id })
      .from(affiliateLinks)
      .innerJoin(
        affiliateCoursePartnerships,
        eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
      )
      .where(
        and(
          eq(affiliateLinks.id, linkId),
          eq(affiliateCoursePartnerships.affiliateId, userId),
          eq(affiliateCoursePartnerships.status, 'approved'),
        ),
      )
    if (!link) throw new NotFoundException('Link não encontrado para este afiliado')
    return link
  }

  private buildMetadata(input: UpsertLinkInput) {
    const destination = input.destinationPath
    return {
      campaign_name: input.campaignName ?? null,
      traffic_source: input.trafficSource ?? null,
      destination_path: destination
        ? destination.startsWith('/')
          ? destination
          : `/${destination}`
        : null,
      notes: input.notes ?? null,
    }
  }

  async createLink(userId: string, input: UpsertLinkInput): Promise<{ success: true; id: number }> {
    const partnership = await this.getApprovedPartnership(userId, input.partnershipId)
    const metadata = this.buildMetadata(input)
    const slug = input.campaignName ? slugify(input.campaignName) || null : null
    // Até 100 caracteres: o código inteiro (com sufixo) precisa caber nos 120 aceitos no clique.
    const codeBase =
      slugify(
        [partnership.courseSlug, input.campaignName || input.trafficSource || 'campanha'].join('-'),
      )
        .slice(0, 100)
        .replace(/-+$/, '') || 'afiliado'

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = `${codeBase}-${randomBytes(3).toString('hex').slice(0, 4)}`
      try {
        const [created] = await this.db
          .insert(affiliateLinks)
          .values({
            partnershipId: partnership.id,
            code,
            slug,
            isActive: input.isActive,
            metadata,
          })
          .returning({ id: affiliateLinks.id })
        return { success: true, id: created!.id }
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        // Código repetido: tenta outro sufixo. Slug repetido: o nome da campanha já está em uso.
        if (violatedConstraint(error) !== 'affiliate_links_code_key') {
          throw new ConflictException(SLUG_CONFLICT_MESSAGE)
        }
      }
    }
    throw new ConflictException('Não foi possível gerar um código único para o link')
  }

  async updateLink(
    userId: string,
    linkId: number,
    input: UpsertLinkInput,
  ): Promise<{ success: true }> {
    // A parceria nova (se trocou) também precisa ser aprovada e do próprio afiliado.
    await this.getApprovedPartnership(userId, input.partnershipId)
    await this.ensureOwnLink(userId, linkId)

    try {
      await this.db
        .update(affiliateLinks)
        .set({
          partnershipId: input.partnershipId,
          isActive: input.isActive,
          slug: input.campaignName ? slugify(input.campaignName) || null : null,
          metadata: this.buildMetadata(input),
        })
        .where(eq(affiliateLinks.id, linkId))
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(SLUG_CONFLICT_MESSAGE)
      throw error
    }
    return { success: true }
  }

  async setLinkActive(
    userId: string,
    linkId: number,
    isActive: boolean,
  ): Promise<{ success: true }> {
    await this.ensureOwnLink(userId, linkId)
    await this.db.update(affiliateLinks).set({ isActive }).where(eq(affiliateLinks.id, linkId))
    return { success: true }
  }
}
