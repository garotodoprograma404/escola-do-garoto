export interface AffiliateApprovedPartnershipOption {
  id: string
  courseId: string
  courseTitle: string
  courseSlug: string
  commissionRate: number
  cookieWindowDays: number
}

export interface AffiliateDashboardSummary {
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

export interface AffiliateLinkListItem {
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

export interface AffiliateDashboardData {
  summary: AffiliateDashboardSummary
  approvedPartnerships: AffiliateApprovedPartnershipOption[]
  links: AffiliateLinkListItem[]
}
