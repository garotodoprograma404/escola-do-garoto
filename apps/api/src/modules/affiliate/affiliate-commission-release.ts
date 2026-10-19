/** Prazo (em dias) até a comissão pendente virar saldo sacável: a janela de reembolso. */
export const AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS = 30
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asDateString(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  return Number.isNaN(new Date(value.trim()).getTime()) ? null : value.trim()
}

/** Quando a comissão fica liberada: o `release_eligible_at` explícito, ou criação + 30 dias. */
export function getCommissionReleaseEligibleAt(createdAt: Date, metadata: unknown): Date {
  if (isRecord(metadata)) {
    const explicit = asDateString(metadata.release_eligible_at)
    if (explicit) return new Date(explicit)
  }
  return new Date(createdAt.getTime() + AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS * ONE_DAY_MS)
}

export function isCommissionEligibleForRelease(input: {
  createdAt: Date
  status: string
  metadata: unknown
  now?: Date
}): boolean {
  if (input.status !== 'pending') return false
  const eligibleAt = getCommissionReleaseEligibleAt(input.createdAt, input.metadata)
  if (Number.isNaN(eligibleAt.getTime())) return false
  return eligibleAt.getTime() <= (input.now ?? new Date()).getTime()
}
