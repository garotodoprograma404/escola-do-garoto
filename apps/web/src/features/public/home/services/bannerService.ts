// =====================================================
// BANNER SERVICE - DATA FETCHING
// =====================================================

import { unstable_cache } from 'next/cache'
import { apiGetPublic } from '@/lib/api'
import type { Banner, Showcase } from '../types'

type ErrorWithDigest = {
  message?: string
  digest?: string
  code?: string
  cause?: unknown
}

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as ErrorWithDigest
  if (typeof typedError.digest === 'string' && typedError.digest.includes('DYNAMIC_SERVER_USAGE')) {
    return true
  }

  return (
    typeof typedError.message === 'string' && typedError.message.includes('DYNAMIC_SERVER_USAGE')
  )
}

function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as ErrorWithDigest
  const message = typeof typedError.message === 'string' ? typedError.message : ''
  if (
    typedError.code === 'ECONNRESET' ||
    typedError.code === 'ECONNREFUSED' ||
    message.includes('ECONNRESET') ||
    message.includes('ECONNREFUSED') ||
    message.includes('fetch failed') ||
    message.includes('TimeoutError') ||
    message.includes('upstream request timeout') ||
    message.includes('aborted due to timeout')
  ) {
    return true
  }

  if (!typedError.cause || typeof typedError.cause !== 'object') {
    return false
  }

  const cause = typedError.cause as ErrorWithDigest
  const causeMessage = typeof cause.message === 'string' ? cause.message : ''
  return (
    cause.code === 'ECONNRESET' ||
    cause.code === 'ECONNREFUSED' ||
    causeMessage.includes('ECONNRESET') ||
    causeMessage.includes('TimeoutError') ||
    causeMessage.includes('upstream request timeout') ||
    causeMessage.includes('aborted due to timeout')
  )
}

/** Banner como a API pública entrega (só o que a home desenha; sem contadores). */
interface PublicBannerRow {
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
  start_date: string | null
  end_date: string | null
}

interface PublicShowcaseRow {
  id: number
  title: string
  description: string | null
  type: 'manual' | 'dynamic'
  dynamic_filter: { rule?: 'bestsellers' | 'newest' | 'highest_rated'; limit?: number } | null
  course_ids: number[] | null
  is_active: boolean
  display_order: number
}

async function fetchActiveBanners(): Promise<Banner[]> {
  try {
    const data = await apiGetPublic<PublicBannerRow[]>('/public/banners?position=hero')

    return (data ?? []).map((banner) => ({
      id: String(banner.id),
      title: banner.title,
      subtitle: banner.subtitle || '',
      desktopImageUrl: banner.image_url,
      mobileImageUrl: banner.mobile_image_url ?? undefined,
      ctaText: banner.link_text || 'Ver mais',
      ctaLink: banner.link_url || '/catalog',
      backgroundColor: banner.background_color ?? undefined,
      textColor: (banner.text_color as 'white' | 'black') || 'white',
      startDate: banner.start_date ?? new Date().toISOString(),
      endDate: banner.end_date,
      status: 'active' as const,
      position: 'hero' as const,
      order: banner.display_order,
      clicks: 0,
    }))
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return []
    }

    if (isTransientNetworkError(error)) {
      console.warn('Banners indisponiveis temporariamente; seguindo com fallback.')
    } else {
      console.error('Unexpected error fetching banners:', error)
    }
    return []
  }
}

const getActiveBannersCached = unstable_cache(fetchActiveBanners, ['home-active-banners-v3'], {
  revalidate: 60,
  tags: ['home-public', 'home-banners'],
})

export async function getActiveBanners(): Promise<Banner[]> {
  return getActiveBannersCached()
}

async function fetchActiveShowcases(): Promise<Showcase[]> {
  try {
    const data = await apiGetPublic<PublicShowcaseRow[]>('/public/showcases')

    return (data ?? []).map((showcase) => ({
      id: String(showcase.id),
      title: showcase.title,
      description: showcase.description ?? undefined,
      type: showcase.type,
      courseIds: (showcase.course_ids || []).map((id) => String(id)),
      dynamicRule: showcase.dynamic_filter?.rule,
      limit: showcase.dynamic_filter?.limit || 8,
      active: showcase.is_active,
      order: showcase.display_order,
    }))
  } catch (error) {
    if (isDynamicServerUsageError(error)) {
      return []
    }

    if (isTransientNetworkError(error)) {
      console.warn('Showcases indisponiveis temporariamente; seguindo com fallback.')
    } else {
      console.error('Unexpected error fetching showcases:', error)
    }
    return []
  }
}

const getActiveShowcasesCached = unstable_cache(
  fetchActiveShowcases,
  ['home-active-showcases-v3'],
  {
    revalidate: 120,
    tags: ['home-public', 'home-showcases'],
  },
)

export async function getActiveShowcases(): Promise<Showcase[]> {
  return getActiveShowcasesCached()
}
