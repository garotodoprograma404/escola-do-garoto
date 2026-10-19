import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'
import {
  mapBannerRow,
  mapShowcaseRow,
  type BannerApiRow,
  type ShowcaseApiRow,
} from '../lib/api-rows'
import type { Banner, Showcase, ContentFilters } from '../types'

/** O servidor decide, calcula o status do banner, aplica o limite de ativos e checa o papel. */

function bannerBody(data: Partial<Banner>) {
  return {
    title: data.title,
    subtitle: data.subtitle,
    imageUrl: data.desktopImageUrl,
    mobileImageUrl: data.mobileImageUrl || '',
    linkUrl: data.ctaLink,
    linkText: data.ctaText,
    backgroundColor: data.backgroundColor || '',
    textColor: data.textColor || 'white',
    startDate: data.startDate,
    endDate: data.endDate || '',
    isActive: data.status === 'active',
    position: data.position || 'hero',
  }
}

function showcaseBody(data: Partial<Showcase>) {
  return {
    title: data.title,
    description: data.description || '',
    type: data.type || 'manual',
    courseIds: (data.courseIds ?? []).map((id) => Number(id)),
    dynamicRule: data.dynamicRule,
    limit: data.limit,
    isActive: data.active !== undefined ? data.active : true,
  }
}

export async function getBanners(filters: ContentFilters): Promise<Banner[]> {
  const result = await apiServer<BannerApiRow[]>('/admin/banners', {
    query: {
      search: filters.searchTerm || undefined,
      position: filters.position && filters.position !== 'ALL' ? filters.position : undefined,
      status: filters.status !== 'ALL' ? filters.status : undefined,
    },
  })

  if (!result.ok) {
    console.error('Error fetching banners:', result.error.message)
    throw new Error('Erro ao buscar banners')
  }

  let banners = result.data.map(mapBannerRow)

  // Filtro por data
  if (filters.dateFilter && filters.dateFilter !== 'ALL') {
    banners = banners.filter((banner) => {
      switch (filters.dateFilter) {
        case 'active-today':
          return banner.status === 'active'
        case 'scheduled':
          return banner.status === 'scheduled'
        case 'expired':
          return banner.status === 'expired'
        default:
          return true
      }
    })
  }

  return banners
}

export async function getShowcases(): Promise<Showcase[]> {
  const result = await apiServer<ShowcaseApiRow[]>('/admin/showcases')

  if (!result.ok) {
    console.error('Error fetching showcases:', result.error.message)
    throw new Error('Erro ao buscar showcases')
  }

  return result.data.map(mapShowcaseRow)
}

export async function createBanner(data: Partial<Banner>): Promise<Banner> {
  const result = await apiServer<BannerApiRow>('/admin/banners', { body: bannerBody(data) })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao criar banner'))
  }
  return mapBannerRow(result.data)
}

export async function updateBanner(id: string, data: Partial<Banner>): Promise<Banner> {
  const result = await apiServer<BannerApiRow>(`/admin/banners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: bannerBody(data),
  })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao atualizar banner'))
  }
  return mapBannerRow(result.data)
}

export async function deleteBanner(id: string): Promise<void> {
  const result = await apiServer(`/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao excluir banner'))
  }
}

export async function moveBanner(id: string, direction: 'up' | 'down'): Promise<void> {
  const result = await apiServer(`/admin/banners/${encodeURIComponent(id)}/move`, {
    body: { direction },
  })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao reordenar banners'))
  }
}

export async function createShowcase(data: Partial<Showcase>): Promise<Showcase> {
  const result = await apiServer<ShowcaseApiRow>('/admin/showcases', { body: showcaseBody(data) })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao criar showcase'))
  }
  return mapShowcaseRow(result.data)
}

export async function updateShowcase(id: string, data: Partial<Showcase>): Promise<Showcase> {
  const result = await apiServer<ShowcaseApiRow>(`/admin/showcases/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: showcaseBody(data),
  })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao atualizar showcase'))
  }
  return mapShowcaseRow(result.data)
}

export async function deleteShowcase(id: string): Promise<void> {
  const result = await apiServer(`/admin/showcases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao excluir showcase'))
  }
}

export async function moveShowcase(id: string, direction: 'up' | 'down'): Promise<void> {
  const result = await apiServer(`/admin/showcases/${encodeURIComponent(id)}/move`, {
    body: { direction },
  })
  if (!result.ok) {
    throw new Error(apiErrorMessage(result.error, 'Erro ao reordenar vitrines'))
  }
}
