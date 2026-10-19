type AffiliatePartnershipStatus = 'pending' | 'approved' | 'rejected' | 'revoked'
export type AffiliateApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface AffiliateAdminStats {
  totalAffiliates: number
  activeAffiliates: number
  pendingApplications: number
  pendingPartnerships: number
  approvedPartnerships: number
  trackedSales: number
  affiliateCommissionTotal: number
}

export interface AffiliateAdminListItem {
  affiliateId: string
  name: string
  email: string
  partnershipCount: number
  approvedPartnershipCount: number
  trackedSalesCount: number
  totalCommission: number
  pendingCommission: number
  availableCommission: number
}

export interface AffiliatePartnershipListItem {
  id: string
  affiliateId: string
  affiliateName: string
  affiliateEmail: string
  courseId: string
  courseTitle: string
  producerId: string
  producerName: string
  status: AffiliatePartnershipStatus
  commissionRate: number
  cookieWindowDays: number
  linksCount: number
  createdAt: string
  approvedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  notes: string | null
}

export interface AffiliateSalesAuditRow {
  transactionId: string
  affiliateId: string
  affiliateName: string
  courseId: string
  courseTitle: string
  producerId: string
  producerName: string
  orderId: string
  orderPublicId: string
  orderItemId: string | null
  paymentId: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  affiliateLinkCode: string | null
  attributedAt: string | null
  createdAt: string
}

export interface AffiliateOption {
  id: string
  name: string
  email: string
}

export interface AffiliateCourseOption {
  id: string
  title: string
  producerId: string
  producerName: string
}

export interface AffiliateApplicationListItem {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  instagramHandle: string | null
  youtubeChannel: string | null
  websiteUrl: string | null
  audienceSize: string | null
  audienceSummary: string
  promotionChannels: string[]
  experienceSummary: string
  whyAffiliate: string
  status: AffiliateApplicationStatus
  rejectionReason: string | null
  notes: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
  hasAffiliateRole: boolean
  partnershipCount: number
  approvedPartnershipCount: number
}

export interface AffiliateAdminDashboardData {
  stats: AffiliateAdminStats
  applications: AffiliateApplicationListItem[]
  affiliates: AffiliateAdminListItem[]
  partnerships: AffiliatePartnershipListItem[]
  salesAudit: AffiliateSalesAuditRow[]
  affiliateOptions: AffiliateOption[]
  courseOptions: AffiliateCourseOption[]
}
