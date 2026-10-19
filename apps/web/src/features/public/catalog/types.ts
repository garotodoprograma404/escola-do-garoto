// =====================================================
// PUBLIC CATALOG - TYPES
// =====================================================

export interface CatalogFilters {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  level?: 'beginner' | 'intermediate' | 'advanced'
  sortBy?: 'newest' | 'popular' | 'price_low' | 'price_high' | 'rating'
  page?: number
  limit?: number
}

export interface CatalogCourse {
  id: string
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  level: string
  total_students: number
  total_lessons: number
  duration_hours: number
  category_name: string
  category_slug: string
  producer_name: string
  producer_avatar: string | null
  created_at: string
}

export interface CatalogResult {
  courses: CatalogCourse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CategoryOption {
  id: string
  name: string
  slug: string
  course_count: number
}
