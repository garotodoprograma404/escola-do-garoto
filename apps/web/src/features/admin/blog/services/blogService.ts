import { apiServer } from '@/lib/server-api'
import { mapBlogPostRow, type BlogPostApiRow } from '../lib/api-rows'
import type { BlogPost, BlogFilters } from '../types'

/** O servidor confere o papel de admin em toda chamada. */

interface PostsPage {
  posts: BlogPostApiRow[]
  total: number
}

/** Uma página de posts (a API pagina e filtra no banco). */
export async function getBlogPostsPage(
  filters: BlogFilters,
  page = 1,
  limit = 10,
): Promise<{ posts: BlogPost[]; total: number }> {
  const result = await apiServer<PostsPage>('/admin/blog/posts', {
    query: {
      status: filters.status !== 'ALL' ? filters.status : undefined,
      category: filters.categoryId !== 'ALL' ? filters.categoryId : undefined,
      authorId: filters.authorId !== 'ALL' ? filters.authorId : undefined,
      featured: filters.isFeatured === true ? 'true' : undefined,
      search: filters.searchTerm || undefined,
      page,
      limit,
    },
  })

  if (!result.ok) {
    console.error('Error fetching blog posts:', result.error.message)
    return { posts: [], total: 0 }
  }

  return { posts: result.data.posts.map(mapBlogPostRow), total: result.data.total }
}

export async function getBlogPosts(filters: BlogFilters): Promise<BlogPost[]> {
  const { posts } = await getBlogPostsPage(filters, 1, 500)
  return posts
}
