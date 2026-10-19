'use server'

import { getBlogPostsPage } from '../services/blogService'
import type { BlogFilters, BlogPost } from '../types'

const POSTS_PER_PAGE = 10

interface PaginatedResult {
  posts: BlogPost[]
  totalPages: number
  currentPage: number
  totalPosts: number
}

export async function getPostsPaginatedAction(
  filters: BlogFilters,
  page: number = 1,
): Promise<PaginatedResult> {
  try {
    // A API filtra e pagina no banco.
    const first = await getBlogPostsPage(filters, Math.max(1, page), POSTS_PER_PAGE)
    const totalPosts = first.total
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE)
    const currentPage = Math.max(1, Math.min(page, totalPages || 1))

    // Página pedida além do fim: busca a última.
    const { posts } =
      currentPage === Math.max(1, page)
        ? first
        : await getBlogPostsPage(filters, currentPage, POSTS_PER_PAGE)

    return { posts, totalPages, currentPage, totalPosts }
  } catch (error) {
    console.error('Error in getPostsPaginatedAction:', error)
    return {
      posts: [],
      totalPages: 0,
      currentPage: 1,
      totalPosts: 0,
    }
  }
}
