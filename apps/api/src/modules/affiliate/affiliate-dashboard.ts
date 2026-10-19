import { centsToReais } from './affiliate-money.js'

/** Formatos devolvidos ao front: os mesmos que os componentes do painel já usavam. */
export type AffiliateApprovedPartnershipOption = {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  commissionRate: number
  cookieWindowDays: number
}

export type AffiliateDashboardSummary = {
  approvedPartnerships: number
  totalLinks: number
  activeLinks: number
  totalClicks: number
  totalConversions: number
  totalNetConversions: number
  conversionRate: number
  netConversionRate: number
  attributedRevenue: number
  totalCommission: number
  pendingCommission: number
  availableCommission: number
}

export type AffiliateLinkListItem = {
  id: string
  partnershipId: string
  courseId: string
  courseTitle: string
  courseSlug: string
  code: string
  slug: string | null
  isActive: boolean
  campaignName: string | null
  trafficSource: string | null
  notes: string | null
  destinationPath: string
  shareUrl: string
  commissionRate: number
  cookieWindowDays: number
  clicks: number
  conversions: number
  grossConversions: number
  netConversions: number
  conversionRate: number
  netConversionRate: number
  attributedRevenue: number
  pendingCommission: number
  releasedCommission: number
  reversedCommission: number
  lastClickAt: string | null
  lastConversionAt: string | null
  createdAt: string
  updatedAt: string
}

export type AffiliateDashboardData = {
  summary: AffiliateDashboardSummary
  approvedPartnerships: AffiliateApprovedPartnershipOption[]
  links: AffiliateLinkListItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function metadataText(metadata: unknown, key: string): string | null {
  if (!isRecord(metadata)) return null
  const value = metadata[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/** Caminho de destino do link: o escolhido pelo afiliado ou a página do curso. */
export function buildDestinationPath(courseSlug: string, metadata: unknown): string {
  const explicit = metadataText(metadata, 'destination_path')
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}`
  return `/courses/${courseSlug}`
}

export function buildShareUrl(appUrl: string, destinationPath: string, code: string): string {
  const base = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
  return `${base}${destinationPath}?aff=${encodeURIComponent(code)}`
}

/** Cliques por link (já agregados no banco). */
export type ClickMetric = { linkId: number; clicks: number; lastClickAt: Date | null }

/** Comissões por link e status (já agregadas no banco), tudo em centavos. */
export type ConversionMetric = {
  linkId: number
  status: string
  count: number
  amountCents: number
  grossSaleCents: number
  lastAt: Date | null
}

/** Item de link com os acumuladores em centavos (convertidos para reais só no fim). */
type LinkAccumulator = Omit<
  AffiliateLinkListItem,
  'attributedRevenue' | 'pendingCommission' | 'releasedCommission' | 'reversedCommission'
> & { revenueCents: number; pendingCents: number; releasedCents: number; reversedCents: number }

export type EmptyLinkItem = Omit<
  AffiliateLinkListItem,
  | 'clicks'
  | 'conversions'
  | 'grossConversions'
  | 'netConversions'
  | 'conversionRate'
  | 'netConversionRate'
  | 'attributedRevenue'
  | 'pendingCommission'
  | 'releasedCommission'
  | 'reversedCommission'
  | 'lastClickAt'
  | 'lastConversionAt'
>

/** Junta cliques e conversões (comissões) a cada link. Mesma regra do `hydrateAffiliateLinkMetrics`. */
export function hydrateLinkMetrics(
  links: EmptyLinkItem[],
  clicks: ClickMetric[],
  conversions: ConversionMetric[],
): AffiliateLinkListItem[] {
  const byId = new Map<number, LinkAccumulator>(
    links.map((link) => [
      Number(link.id),
      {
        ...link,
        clicks: 0,
        conversions: 0,
        grossConversions: 0,
        netConversions: 0,
        conversionRate: 0,
        netConversionRate: 0,
        lastClickAt: null,
        lastConversionAt: null,
        revenueCents: 0,
        pendingCents: 0,
        releasedCents: 0,
        reversedCents: 0,
      },
    ]),
  )

  for (const row of clicks) {
    const link = byId.get(row.linkId)
    if (!link) continue
    link.clicks += row.clicks
    if (row.lastClickAt && (!link.lastClickAt || row.lastClickAt > new Date(link.lastClickAt))) {
      link.lastClickAt = row.lastClickAt.toISOString()
    }
  }

  for (const row of conversions) {
    const link = byId.get(row.linkId)
    if (!link) continue

    link.grossConversions += row.count
    if (row.status === 'pending' || row.status === 'completed') {
      link.netConversions += row.count
      link.revenueCents += row.grossSaleCents
      if (row.status === 'pending') link.pendingCents += row.amountCents
      else link.releasedCents += row.amountCents
    } else if (row.status === 'failed' || row.status === 'refunded') {
      link.reversedCents += row.amountCents
    }

    if (row.lastAt && (!link.lastConversionAt || row.lastAt > new Date(link.lastConversionAt))) {
      link.lastConversionAt = row.lastAt.toISOString()
    }
  }

  return [...byId.values()].map((acc) => {
    const { revenueCents, pendingCents, releasedCents, reversedCents, ...link } = acc
    return {
      ...link,
      conversions: link.grossConversions,
      conversionRate: link.clicks > 0 ? (link.grossConversions / link.clicks) * 100 : 0,
      netConversionRate: link.clicks > 0 ? (link.netConversions / link.clicks) * 100 : 0,
      attributedRevenue: centsToReais(revenueCents),
      pendingCommission: centsToReais(pendingCents),
      releasedCommission: centsToReais(releasedCents),
      reversedCommission: centsToReais(reversedCents),
    }
  })
}

export function buildDashboardSummary(
  approvedPartnershipsCount: number,
  links: AffiliateLinkListItem[],
): AffiliateDashboardSummary {
  // Soma em centavos para não acumular erro de ponto flutuante.
  const sumCents = (pick: (link: AffiliateLinkListItem) => number) =>
    links.reduce((sum, link) => sum + Math.round(pick(link) * 100), 0)

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0)
  const totalConversions = links.reduce((sum, link) => sum + link.grossConversions, 0)
  const totalNetConversions = links.reduce((sum, link) => sum + link.netConversions, 0)
  const pendingCents = sumCents((link) => link.pendingCommission)
  const availableCents = sumCents((link) => link.releasedCommission)
  const reversedCents = sumCents((link) => link.reversedCommission)

  return {
    approvedPartnerships: approvedPartnershipsCount,
    totalLinks: links.length,
    activeLinks: links.filter((link) => link.isActive).length,
    totalClicks,
    totalConversions,
    totalNetConversions,
    conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    netConversionRate: totalClicks > 0 ? (totalNetConversions / totalClicks) * 100 : 0,
    attributedRevenue: centsToReais(sumCents((link) => link.attributedRevenue)),
    totalCommission: centsToReais(pendingCents + availableCents + reversedCents),
    pendingCommission: centsToReais(pendingCents),
    availableCommission: centsToReais(availableCents),
  }
}
