import type { BlogPost, PostStatus } from '../types'

/** Post como a API do admin entrega (snake_case; a lista vem sem `content`). */
export interface BlogPostApiRow {
  id: number
  author_id: string
  author_name: string | null
  author_avatar_url: string | null
  title: string
  slug: string
  excerpt: string | null
  content?: string
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  status: PostStatus
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
}

export function mapBlogPostRow(row: BlogPostApiRow): BlogPost {
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    content: row.content ?? '',
    coverImageUrl: row.featured_image_url || undefined,
    authorId: row.author_id,
    authorName: row.author_name || 'Autor Desconhecido',
    authorAvatar: row.author_avatar_url || undefined,
    status: row.status,
    publishedAt: row.published_at,
    scheduledFor: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    views: row.total_views,
    likes: row.total_likes,
    commentsCount: row.total_comments,
    readingTime: row.reading_time_minutes || 0,
    tags: row.tags || [],
    categoryId: row.category || undefined,
    categoryName: row.category || undefined,
    seo: {
      metaTitle: row.seo_title || row.title,
      metaDescription: row.seo_description || row.excerpt || '',
      keywords: row.seo_keywords || [],
      ogImage: row.featured_image_url || undefined,
    },
  }
}
