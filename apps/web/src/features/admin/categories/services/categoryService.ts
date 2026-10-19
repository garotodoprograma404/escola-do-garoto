import { apiServer } from '@/lib/server-api'
import { mapCategoryRow, type CategoryApiRow } from '../lib/api-rows'
import type { Category, CategoryFiltersData } from '../types'

export async function getCategories(filters: CategoryFiltersData): Promise<Category[]> {
  const result = await apiServer<CategoryApiRow[]>('/admin/categories', {
    query: { search: filters.searchTerm || undefined, status: filters.status },
  })

  if (!result.ok) {
    console.error('Error fetching categories:', result.error.message)
    throw new Error('Erro ao buscar categorias')
  }

  return result.data.map(mapCategoryRow)
}
