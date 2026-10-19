// Category management types

type CategoryStatus = 'active' | 'inactive'

interface CategorySEO {
  metaTitle: string
  metaDescription: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  courseCount: number
  status: CategoryStatus
  parentId: string | null
  isFeatured: boolean
  order: number
  coverImage?: string
  seo?: CategorySEO
}

export interface CategoryFiltersData {
  searchTerm: string
  status: CategoryStatus | 'ALL'
}
