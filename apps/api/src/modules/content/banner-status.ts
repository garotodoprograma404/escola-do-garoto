export type BannerStatus = 'scheduled' | 'active' | 'expired' | 'inactive'

/**
 * Status calculado do banner (era a função SQL `calculate_banner_status`):
 * começa no futuro = agendado; já terminou = expirado; ligado dentro do prazo = ativo; senão inativo.
 */
export function calculateBannerStatus(
  startDate: Date | null,
  endDate: Date | null,
  isActive: boolean,
  now: Date = new Date(),
): BannerStatus {
  if (startDate && startDate > now) return 'scheduled'
  if (endDate && endDate < now) return 'expired'
  if (isActive) return 'active'
  return 'inactive'
}

/** Dias até o banner expirar: `null` sem data final, negativo se já expirou. */
export function calculateDaysUntilExpiration(
  endDate: Date | null,
  now: Date = new Date(),
): number | null {
  if (!endDate) return null
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}
