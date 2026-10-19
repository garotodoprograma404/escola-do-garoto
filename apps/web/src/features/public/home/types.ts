export interface FeaturedCourse {
  id: string
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  total_students: number
  category_name: string
  producer_name: string
  producer_avatar: string | null
}

type ContentStatus = 'active' | 'scheduled' | 'expired' | 'inactive'
type BannerPosition = 'hero' | 'mid-page' | 'popup'

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
