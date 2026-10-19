/** Regras puras de atribuição por último clique (sem banco): testáveis sem Nest. */

const AFFILIATE_CODE_MAX_LENGTH = 120

export type AttributionCandidate = {
  id: number
  affiliateId: string
  affiliateLinkId: number
  courseId: number
  attributedAt: Date
  expiresAt: Date
}

/** O que o link/parceria diz no momento da consulta (só vale se o link e a parceria estão ativos). */
export type ResolvedLink = {
  affiliateId: string
  affiliateLinkId: number
  affiliateLinkCode: string
  partnershipId: number
  courseId: number
  /** Percentual (0-100, até 2 casas). */
  commissionRate: number
  cookieWindowDays: number
}

/** Atribuição vigente para um curso: é o "snapshot" que o checkout guarda no item do pedido. */
export type ActiveAttribution = {
  attributionId: number
  attributionModel: 'last_click'
  affiliateId: string
  affiliateLinkId: number
  affiliateLinkCode: string
  partnershipId: number
  courseId: number
  commissionRate: number
  cookieWindowDays: number
  attributedAt: string
  expiresAt: string
}

/** Código do link só com letras/números/hífen/sublinhado (é o que o gerador cria). */
export function normalizeAffiliateCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > AFFILIATE_CODE_MAX_LENGTH) return null
  return /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : null
}

/** Códigos candidatos, em ordem de preferência: como veio, em maiúsculas e em minúsculas. */
export function buildAffiliateCodeCandidates(code: unknown): string[] {
  const normalized = normalizeAffiliateCode(code)
  if (!normalized) return []
  return [...new Set([normalized, normalized.toUpperCase(), normalized.toLowerCase()])]
}

/**
 * Último clique válido por curso. Se o clique mais recente aponta para um link que deixou de valer
 * (desativado, parceria revogada, curso diferente), cai para o clique válido anterior.
 */
export function pickLatestAttributions(
  candidates: AttributionCandidate[],
  validLinksById: Map<number, ResolvedLink>,
): Map<number, { candidate: AttributionCandidate; link: ResolvedLink }> {
  const sorted = [...candidates].sort(
    (left, right) => right.attributedAt.getTime() - left.attributedAt.getTime(),
  )
  const resolved = new Map<number, { candidate: AttributionCandidate; link: ResolvedLink }>()

  for (const candidate of sorted) {
    if (resolved.has(candidate.courseId)) continue
    const link = validLinksById.get(candidate.affiliateLinkId)
    if (!link) continue
    if (link.courseId !== candidate.courseId || link.affiliateId !== candidate.affiliateId) continue
    resolved.set(candidate.courseId, { candidate, link })
  }
  return resolved
}

export function toActiveAttribution(
  candidate: AttributionCandidate,
  link: ResolvedLink,
): ActiveAttribution {
  return {
    attributionId: candidate.id,
    attributionModel: 'last_click',
    affiliateId: link.affiliateId,
    affiliateLinkId: link.affiliateLinkId,
    affiliateLinkCode: link.affiliateLinkCode,
    partnershipId: link.partnershipId,
    courseId: link.courseId,
    commissionRate: link.commissionRate,
    cookieWindowDays: link.cookieWindowDays,
    attributedAt: candidate.attributedAt.toISOString(),
    expiresAt: candidate.expiresAt.toISOString(),
  }
}
