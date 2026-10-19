'use server'

import { apiServer } from '@/lib/server-api'

interface CategoryDetails {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  parentId: string | null
  displayOrder: number
  isActive: boolean
  isFeatured: boolean
  coverImageUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  hasChildren: boolean
  childrenCount: number
}

interface GetCategoryDetailsResult {
  success: boolean
  error?: string
  data?: CategoryDetails
}

interface CategoryDetailsRow {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  parent_id: number | null
  display_order: number
  is_active: boolean
  is_featured: boolean | null
  cover_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  children_count: number
}

export async function getCategoryDetailsAction(
  categoryId: string,
): Promise<GetCategoryDetailsResult> {
  const result = await apiServer<CategoryDetailsRow>(
    `/admin/categories/${encodeURIComponent(categoryId)}`,
  )

  if (!result.ok) {
    return {
      success: false,
      error:
        result.error.statusCode === 404
          ? 'Categoria não encontrada'
          : 'Erro ao buscar detalhes da categoria',
    }
  }

  const category = result.data
  return {
    success: true,
    data: {
      id: String(category.id),
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      parentId: category.parent_id === null ? null : String(category.parent_id),
      displayOrder: category.display_order,
      isActive: category.is_active,
      isFeatured: category.is_featured || false,
      coverImageUrl: category.cover_image_url,
      metaTitle: category.meta_title,
      metaDescription: category.meta_description,
      hasChildren: (category.children_count || 0) > 0,
      childrenCount: category.children_count || 0,
    },
  }
}
