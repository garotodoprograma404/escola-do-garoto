// =====================================================
// BLOG FEATURE - TYPES
// =====================================================

export interface BlogPost {
  id: number
  /** A API pública não devolve o id do autor. */
  author_id?: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published' | 'archived'
  is_featured: boolean
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
  total_views: number
  total_likes: number
  total_comments: number
  reading_time_minutes: number | null
  created_at: string
  updated_at: string
  author?: {
    full_name: string
    avatar_url: string | null
  } | null
}

export interface BlogFiltersType {
  category?: string
  search?: string
  page?: number
  limit?: number
}

export interface BlogListResult {
  posts: BlogPost[]
  total: number
  page: number
  totalPages: number
  categories: string[]
}
