const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const DATE_RANGES = ['7d', '30d', '90d', '1y', 'all'] as const
export type DateRange = (typeof DATE_RANGES)[number]

const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

/** Início do período (ou `null` para "todo o histórico"). */
export function rangeStart(range: DateRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null
  return new Date(now.getTime() - RANGE_DAYS[range] * ONE_DAY_MS)
}

export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * ONE_DAY_MS)
}
