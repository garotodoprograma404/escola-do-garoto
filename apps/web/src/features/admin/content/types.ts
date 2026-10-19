// Content management types

export type ContentStatus = 'active' | 'scheduled' | 'expired' | 'inactive'
export type BannerPosition = 'hero' | 'mid-page' | 'popup'

export interface Banner {
  id: string
  title: string
  subtitle: string
  desktopImageUrl: string
  mobileImageUrl?: string
  ctaText: string
  ctaLink: string
  backgroundColor?: string
  textColor?: 'white' | 'black'
  startDate: string
  endDate: string | null
  status: ContentStatus
  position: BannerPosition
  order: number
  clicks: number
  daysUntilExpiration?: number | null
}

export interface Showcase {
  id: string
  title: string
  description?: string
  type: 'manual' | 'dynamic'
  courseIds: string[]
  dynamicRule?: 'bestsellers' | 'newest' | 'highest_rated'
  limit?: number
  active: boolean
  order: number
}

export type DateFilter = 'ALL' | 'active-today' | 'scheduled' | 'expired'

export interface ContentFilters {
  searchTerm: string
  status: ContentStatus | 'ALL'
  position?: BannerPosition | 'ALL'
  dateFilter?: DateFilter
}
