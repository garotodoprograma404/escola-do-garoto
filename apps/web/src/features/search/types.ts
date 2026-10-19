export type SearchResultType = 'course' | 'producer' | 'blog_post'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  description: string
  thumbnail_url?: string | null
  url: string
  metadata?: {
    // Course metadata
    price?: number
    rating?: number
    students_count?: number
    category?: string
    // Producer metadata
    courses_count?: number
    // Blog metadata
    author?: string
    published_at?: string
    category_blog?: string
  }
}

export interface SearchFilters {
  type?: SearchResultType[]
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
}

export interface SearchStats {
  total: number
  courses: number
  producers: number
  blog_posts: number
}
