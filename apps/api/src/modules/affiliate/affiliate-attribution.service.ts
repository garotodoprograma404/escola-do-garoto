import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq, gt, inArray, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  affiliateAttributions,
  affiliateCoursePartnerships,
  affiliateLinks,
} from '../../database/schema/index.js'
import {
  buildAffiliateCodeCandidates,
  pickLatestAttributions,
  toActiveAttribution,
  type ActiveAttribution,
  type AttributionCandidate,
  type ResolvedLink,
} from './affiliate-attribution.js'
import type { RegisterClickInput } from './affiliate.schemas.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
/** Recarregar a página com `?aff=` não conta como novo clique dentro desta janela. */
const CLICK_DEDUPE_WINDOW_MS = 30_000
/** Teto de cliques lidos por consulta de atribuição (a mais recente vale; o resto é histórico). */
const MAX_CANDIDATES = 500
/** Teto de cliques aceitos por link por minuto (freia inflar cliques girando as chaves de rastreio). */
const MAX_CLICKS_PER_LINK_PER_MINUTE = 120
const TRACKING_KEY_PATTERN = /^[A-Za-z0-9-]{8,64}$/

export type FindActiveAttributionInput = {
  courseId: number
  /** Cookie `vox_affiliate_session` do navegador. */
  sessionKey?: string | null
  /** Cookie `vox_affiliate_visitor` do navegador. */
  visitorKey?: string | null
  /** Quem está comprando: se for o próprio afiliado, não há atribuição (anti auto-compra). */
  buyerUserId?: string | null
}

function cleanKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && TRACKING_KEY_PATTERN.test(trimmed) ? trimmed : null
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  return value.length > max ? value.slice(0, max) : value
}

/**
 * Atribuição por último clique. O checkout usa `findActiveAttribution(...)` para saber qual
 * afiliado (se houver) ganha a venda de um curso; o proxy do front usa `registerClick`.
 */
@Injectable()
export class AffiliateAttributionService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Registra o clique num link de afiliado (rota pública chamada pelo proxy do Next).
   * Código desconhecido, link inativo ou parceria não aprovada: não faz nada e não avisa quem
   * chamou (a resposta é igual nos dois casos, para não revelar quais códigos existem).
   */
  async registerClick(input: RegisterClickInput): Promise<void> {
    const candidates = buildAffiliateCodeCandidates(input.code)
    if (candidates.length === 0) return

    const rows = await this.db
      .select({
        linkId: affiliateLinks.id,
        code: affiliateLinks.code,
        isActive: affiliateLinks.isActive,
        partnershipId: affiliateCoursePartnerships.id,
        affiliateId: affiliateCoursePartnerships.affiliateId,
        courseId: affiliateCoursePartnerships.courseId,
        status: affiliateCoursePartnerships.status,
        cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
      })
      .from(affiliateLinks)
      .innerJoin(
        affiliateCoursePartnerships,
        eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
      )
      .where(inArray(affiliateLinks.code, candidates))

    // Ordem de preferência: como veio, MAIÚSCULAS, minúsculas.
    const link = candidates
      .map((candidate) => rows.find((row) => row.code === candidate))
      .find((row) => row?.isActive && row.status === 'approved')
    if (!link) return

    const now = new Date()
    const [recent] = await this.db
      .select({ id: affiliateAttributions.id })
      .from(affiliateAttributions)
      .where(
        and(
          eq(affiliateAttributions.sessionKey, input.sessionKey),
          eq(affiliateAttributions.affiliateLinkId, link.linkId),
          gt(affiliateAttributions.attributedAt, new Date(now.getTime() - CLICK_DEDUPE_WINDOW_MS)),
        ),
      )
      .limit(1)
    if (recent) return

    const [burst] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(affiliateAttributions)
      .where(
        and(
          eq(affiliateAttributions.affiliateLinkId, link.linkId),
          gt(affiliateAttributions.attributedAt, new Date(now.getTime() - 60_000)),
        ),
      )
    if ((burst?.total ?? 0) >= MAX_CLICKS_PER_LINK_PER_MINUTE) return

    await this.db.insert(affiliateAttributions).values({
      affiliateId: link.affiliateId,
      affiliateLinkId: link.linkId,
      courseId: link.courseId,
      sessionKey: input.sessionKey,
      visitorKey: input.visitorKey ?? null,
      attributionModel: 'last_click',
      attributedAt: now,
      expiresAt: new Date(now.getTime() + link.cookieWindowDays * ONE_DAY_MS),
      metadata: {
        source: 'affiliate_link_click',
        path: truncate(input.path, 500),
        search: truncate(input.search, 1000),
        referrer: truncate(input.referrer, 1000),
        user_agent: truncate(input.userAgent, 500),
        affiliate_link_code: link.code,
      },
    })
  }

  /**
   * Atribuição vigente de UM curso para quem tem estes cookies (último clique válido dentro da
   * janela da parceria), ou `null`. Também devolve `null` se quem compra é o próprio afiliado.
   */
  async findActiveAttribution(
    input: FindActiveAttributionInput,
    executor: DbExecutor = this.db,
  ): Promise<ActiveAttribution | null> {
    const found = await this.findActiveAttributionsForCourses(
      { ...input, courseIds: [input.courseId] },
      executor,
    )
    return found.get(input.courseId) ?? null
  }

  /** Versão para carrinho: uma atribuição por curso (chave = id do curso). */
  async findActiveAttributionsForCourses(
    input: Omit<FindActiveAttributionInput, 'courseId'> & { courseIds: number[] },
    executor: DbExecutor = this.db,
  ): Promise<Map<number, ActiveAttribution>> {
    const courseIds = [...new Set(input.courseIds.filter((id) => Number.isInteger(id) && id > 0))]
    const sessionKey = cleanKey(input.sessionKey)
    const visitorKey = cleanKey(input.visitorKey)
    if (courseIds.length === 0 || (!sessionKey && !visitorKey)) return new Map()

    const keyFilters: SQL[] = []
    if (sessionKey) keyFilters.push(eq(affiliateAttributions.sessionKey, sessionKey))
    if (visitorKey) keyFilters.push(eq(affiliateAttributions.visitorKey, visitorKey))

    const candidates: AttributionCandidate[] = await executor
      .select({
        id: affiliateAttributions.id,
        affiliateId: affiliateAttributions.affiliateId,
        affiliateLinkId: affiliateAttributions.affiliateLinkId,
        courseId: affiliateAttributions.courseId,
        attributedAt: affiliateAttributions.attributedAt,
        expiresAt: affiliateAttributions.expiresAt,
      })
      .from(affiliateAttributions)
      .where(
        and(
          inArray(affiliateAttributions.courseId, courseIds),
          gt(affiliateAttributions.expiresAt, new Date()),
          or(...keyFilters),
        ),
      )
      .orderBy(desc(affiliateAttributions.attributedAt))
      .limit(MAX_CANDIDATES)
    if (candidates.length === 0) return new Map()

    const linkRows = await executor
      .select({
        linkId: affiliateLinks.id,
        code: affiliateLinks.code,
        isActive: affiliateLinks.isActive,
        partnershipId: affiliateCoursePartnerships.id,
        affiliateId: affiliateCoursePartnerships.affiliateId,
        courseId: affiliateCoursePartnerships.courseId,
        status: affiliateCoursePartnerships.status,
        commissionRate: affiliateCoursePartnerships.commissionRate,
        cookieWindowDays: affiliateCoursePartnerships.cookieWindowDays,
      })
      .from(affiliateLinks)
      .innerJoin(
        affiliateCoursePartnerships,
        eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
      )
      .where(inArray(affiliateLinks.id, [...new Set(candidates.map((row) => row.affiliateLinkId))]))

    // Só vale link ativo de parceria aprovada.
    const validLinks = new Map<number, ResolvedLink>(
      linkRows
        .filter((row) => row.isActive && row.status === 'approved')
        .map((row) => [
          row.linkId,
          {
            affiliateId: row.affiliateId,
            affiliateLinkId: row.linkId,
            affiliateLinkCode: row.code,
            partnershipId: row.partnershipId,
            courseId: row.courseId,
            commissionRate: row.commissionRate,
            cookieWindowDays: row.cookieWindowDays,
          },
        ]),
    )

    const picked = pickLatestAttributions(candidates, validLinks)
    const result = new Map<number, ActiveAttribution>()
    for (const [courseId, { candidate, link }] of picked) {
      // Anti auto-compra: o último clique foi do próprio comprador, então ninguém ganha comissão
      // (não cai para o clique de outro afiliado, porque o último clique é que vale).
      if (input.buyerUserId && link.affiliateId === input.buyerUserId) continue
      result.set(courseId, toActiveAttribution(candidate, link))
    }
    return result
  }
}
