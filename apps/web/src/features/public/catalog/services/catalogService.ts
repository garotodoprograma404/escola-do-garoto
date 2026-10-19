// =====================================================
// PUBLIC CATALOG - SERVICE
// =====================================================
// A regra (só cursos aprovados e publicados, filtros, ordenação, contagens) mora na API:
// GET /api/public/catalog/*. Aqui só chamamos e entregamos o formato que os componentes esperam.

import { apiServer } from '@/lib/server-api'
import type { CatalogFilters, CatalogResult, CategoryOption } from '../types'

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Busca cursos com filtros e paginação
 */
export async function getCatalogCourses(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const page = finiteNumber(filters.page)
  const limit = finiteNumber(filters.limit)

  const result = await apiServer<CatalogResult>('/public/catalog/courses', {
    query: {
      search: filters.search?.trim() || undefined,
      category: filters.category || undefined,
      level: filters.level,
      minPrice: finiteNumber(filters.minPrice),
      maxPrice: finiteNumber(filters.maxPrice),
      rating: finiteNumber(filters.rating),
      sortBy: filters.sortBy,
      // Página/limite inválidos na URL (?page=abc) caem no padrão em vez de quebrar a tela.
      page: page && page >= 1 ? Math.floor(page) : 1,
      limit: limit && limit >= 1 ? Math.floor(limit) : undefined,
    },
  })

  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

/**
 * Busca categorias para filtros
 */
export async function getCategoriesForFilter(): Promise<CategoryOption[]> {
  const result = await apiServer<CategoryOption[]>('/public/catalog/categories')
  return result.ok ? result.data : []
}
