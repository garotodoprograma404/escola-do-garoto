export const AFFILIATE_QUERY_PARAM = 'aff'
export const AFFILIATE_SESSION_COOKIE_NAME = 'vox_affiliate_session'
export const AFFILIATE_VISITOR_COOKIE_NAME = 'vox_affiliate_visitor'
export const AFFILIATE_VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

/** Chaves de rastreio dos cookies (as mesmas que a API aceita: UUID, nada de texto livre). */
const TRACKING_KEY_PATTERN = /^[A-Za-z0-9-]{8,64}$/

export function normalizeAffiliateCode(value: unknown): string | null {
  const normalized = String(value || '').trim()
  return normalized.length > 0 ? normalized.slice(0, 120) : null
}

export function generateAffiliateTrackingKey(): string {
  return crypto.randomUUID()
}

/** Valor de cookie que pode virar chave de rastreio (cookie adulterado ou inválido é descartado). */
export function isValidAffiliateTrackingKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && TRACKING_KEY_PATTERN.test(value)
}
