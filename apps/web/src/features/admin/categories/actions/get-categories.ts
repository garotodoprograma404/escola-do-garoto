'use server'

import { apiServer } from '@/lib/server-api'
import { mapCategoryRow, type CategoryApiRow } from '../lib/api-rows'
import type { Category } from '../types'

interface GetCategoriesFilters {
  searchTerm?: string
  status?: 'ALL' | 'active' | 'inactive'
  isFeatured?: boolean | null
}

interface GetCategoriesResult {
  success: boolean
  error?: string
  data?: Category[]
}

export async function getCategoriesAction(
  filters: GetCategoriesFilters = {},
): Promise<GetCategoriesResult> {
  const result = await apiServer<CategoryApiRow[]>('/admin/categories', {
    query: {
      search: filters.searchTerm?.trim() || undefined,
      status: filters.status,
      featured:
        filters.isFeatured === null || filters.isFeatured === undefined
          ? undefined
          : String(filters.isFeatured),
    },
  })

  if (!result.ok) {
    console.error('Error fetching categories:', result.error.message)
    return { success: false, error: 'Erro ao buscar categorias' }
  }

  return { success: true, data: result.data.map(mapCategoryRow) }
}
