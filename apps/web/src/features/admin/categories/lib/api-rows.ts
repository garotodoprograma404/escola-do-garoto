import type { Category } from '../types'

/** Linha de categoria como a API entrega (snake_case, o formato que o front consome). */
export interface CategoryApiRow {
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
  courses_count: number
}

export function mapCategoryRow(row: CategoryApiRow): Category {
  return {
    id: String(row.id),
    name: row.name,
    slug: row.slug,
    icon: row.icon && typeof row.icon === 'string' ? row.icon.trim() : '',
    courseCount: row.courses_count ?? 0,
    status: row.is_active ? 'active' : 'inactive',
    parentId: row.parent_id === null || row.parent_id === undefined ? null : String(row.parent_id),
    isFeatured: row.is_featured || false,
    order: row.display_order,
    coverImage: row.cover_image_url || undefined,
    seo:
      row.meta_title || row.meta_description
        ? {
            metaTitle: row.meta_title || '',
            metaDescription: row.meta_description || '',
          }
        : undefined,
  }
}
