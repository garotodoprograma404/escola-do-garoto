'use server'

import { apiServer } from '@/lib/server-api'
import type { BlogPostFormData } from '../lib/validations'

interface PostDetailsRow {
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string | null
  tags: string[] | null
  featured_image_url: string | null
  is_featured: boolean
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[] | null
}

export async function getPostDetailsAction(postId: string): Promise<BlogPostFormData | null> {
  const result = await apiServer<PostDetailsRow>(`/admin/blog/posts/${encodeURIComponent(postId)}`)

  if (!result.ok) {
    console.error('Error fetching post details:', result.error.message)
    return null
  }

  const post = result.data
  // Converter para formato do formulário
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    content: post.content,
    category: post.category || '',
    tags: post.tags || [],
    featuredImageUrl: post.featured_image_url || '',
    isFeatured: post.is_featured,
    seoTitle: post.seo_title || '',
    seoDescription: post.seo_description || '',
    seoKeywords: post.seo_keywords || [],
  }
}
