import type { SearchFilters } from '../types'

/** Endereço da página de busca com o termo e os filtros escolhidos (só o que foi preenchido). */
export function buildSearchHref(query: string, filters: SearchFilters): string {
  const params = new URLSearchParams({ q: query })

  if (filters.type && filters.type.length > 0) {
    params.set('type', filters.type.join(','))
  }
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice))
  if (filters.rating !== undefined) params.set('rating', String(filters.rating))

  return `/search?${params.toString()}`
}
