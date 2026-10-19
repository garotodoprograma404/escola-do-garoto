// Blog CMS types

export type PostStatus = 'draft' | 'published' | 'archived'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImageUrl?: string
  authorId: string
  authorName: string
  authorAvatar?: string
  status: PostStatus
  publishedAt: string | null
  scheduledFor: string | null
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  commentsCount: number
  readingTime: number // em minutos
  tags: string[]
  categoryId?: string
  categoryName?: string
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string[]
    ogImage?: string
  }
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string
  postsCount: number
}

export interface BlogFilters {
  searchTerm: string
  status: PostStatus | 'ALL'
  categoryId: string | 'ALL'
  authorId: string | 'ALL'
  isFeatured?: boolean
}

export interface BlogStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  scheduledPosts: number
  totalViews: number
  totalLikes: number
}
