import type { Banner, ContentStatus, Showcase } from '../types'

/** Banner como a API do admin entrega (snake_case, com status calculado pelo servidor). */
export interface BannerApiRow {
  id: number
  title: string
  subtitle: string | null
  image_url: string
  mobile_image_url: string | null
  link_url: string | null
  link_text: string | null
  background_color: string | null
  text_color: string | null
  display_order: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  total_clicks: number
  position: string | null
  computed_status?: ContentStatus
  days_until_expiration?: number | null
}

export interface ShowcaseApiRow {
  id: number
  title: string
  description: string | null
  type: 'manual' | 'dynamic'
  dynamic_filter: { rule?: 'bestsellers' | 'newest' | 'highest_rated'; limit?: number } | null
  course_ids: number[] | null
  display_order: number
  is_active: boolean
}

export function mapBannerRow(row: BannerApiRow): Banner {
  return {
    id: String(row.id),
    title: row.title,
    subtitle: row.subtitle || '',
    desktopImageUrl: row.image_url,
    mobileImageUrl: row.mobile_image_url || undefined,
    ctaText: row.link_text || 'Saiba Mais',
    ctaLink: row.link_url || '/',
    backgroundColor: row.background_color || undefined,
    textColor: (row.text_color as 'white' | 'black') || 'white',
    startDate: row.start_date || new Date().toISOString(),
    endDate: row.end_date || null,
    status: row.computed_status ?? (row.is_active ? 'active' : 'inactive'),
    position: (row.position as 'hero' | 'mid-page' | 'popup') || 'hero',
    order: row.display_order,
    clicks: row.total_clicks,
    daysUntilExpiration: row.days_until_expiration,
  }
}

export function mapShowcaseRow(row: ShowcaseApiRow): Showcase {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description || undefined,
    type: row.type,
    courseIds: (row.course_ids || []).map((id) => String(id)),
    dynamicRule: row.dynamic_filter?.rule,
    limit: row.dynamic_filter?.limit,
    active: row.is_active,
    order: row.display_order,
  }
}
