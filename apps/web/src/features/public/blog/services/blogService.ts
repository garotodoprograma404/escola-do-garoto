// =====================================================
// BLOG SERVICE
// =====================================================

import { apiGetPublic } from '@/lib/api'
import type { BlogPost, BlogFiltersType, BlogListResult } from '../types'

/** Post como a API pública entrega: sem `content` nas listas (o corpo só vem no detalhe). */
type PublicPostRow = Omit<BlogPost, 'content' | 'author_id'> & { content?: string }

function toBlogPost(row: PublicPostRow): BlogPost {
  return { ...row, content: row.content ?? '' }
}

/**
 * Get published blog posts with filters
 * A API filtra, busca e pagina no banco e só devolve posts publicados.
 */
export async function getBlogPosts(filters: BlogFiltersType = {}): Promise<BlogListResult> {
  const { category, search, page = 1, limit = 12 } = filters

  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (category) params.set('category', category)
  if (search) params.set('search', search)

  try {
    const data = await apiGetPublic<Omit<BlogListResult, 'posts'> & { posts: PublicPostRow[] }>(
      `/public/blog/posts?${params.toString()}`,
    )
    if (!data) throw new Error('Lista de posts indisponível')

    return { ...data, posts: data.posts.map(toBlogPost) }
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return {
      posts: [],
      total: 0,
      page,
      totalPages: 0,
      categories: [],
    }
  }
}

/**
 * Get single blog post by slug
 * O HTML do post já chega limpo (sanitizado no servidor).
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const data = await apiGetPublic<PublicPostRow>(`/public/blog/posts/${encodeURIComponent(slug)}`)
    return data ? toBlogPost(data) : null
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

/**
 * Get related posts by category (a API usa a categoria do próprio post)
 */
export async function getRelatedPosts(
  currentPostId: number,
  _category: string | null,
  limit: number = 3,
): Promise<BlogPost[]> {
  try {
    const data = await apiGetPublic<PublicPostRow[]>(
      `/public/blog/posts/${currentPostId}/related?limit=${limit}`,
    )
    return (data ?? []).map(toBlogPost)
  } catch (error) {
    console.error('Error fetching related posts:', error)
    return []
  }
}
