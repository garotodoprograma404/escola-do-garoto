// =====================================================
// BLOG POST DETAIL PAGE - SERVER COMPONENT
// =====================================================

import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, Eye, User, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { getBlogPostBySlug, getRelatedPosts, BlogCard } from '@/features/public/blog'
import { ViewTracker } from '@/features/public/blog/components/ViewTracker.client'
import { LikeButton } from '@/features/public/blog/components/LikeButton.client'
import { apiServer } from '@/lib/server-api'
import { getCurrentUser } from '@/lib/session'

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post não encontrado',
    }
  }

  return {
    title: post.seo_title || `${post.title} | Blog`,
    description: post.seo_description || post.excerpt || post.title,
    keywords: post.seo_keywords?.join(', '),
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const [relatedPosts, user] = await Promise.all([
    getRelatedPosts(post.id, post.category, 3),
    getCurrentUser(),
  ])

  // Só quem está logado tem estado de curtida; visitante vê a contagem e é levado ao login ao clicar.
  const likeStatus = user
    ? await apiServer<{ isLiked: boolean }>(`/blog/posts/${post.id}/like-status`)
    : null
  const initialLiked = likeStatus?.ok ? likeStatus.data.isLiked : false

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <PublicLayout>
      {/* View Tracker */}
      <ViewTracker postId={post.id} />

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Blog
          </Link>
        </Button>

        {/* Header */}
        <header className="mb-8">
          {/* Category */}
          {post.category && (
            <Badge variant="secondary" className="mb-4">
              {post.category}
            </Badge>
          )}

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold">{post.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* Author */}
            {post.author && (
              <div className="flex items-center gap-2">
                {post.author.avatar_url && (
                  <div className="relative h-8 w-8 overflow-hidden rounded-full">
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.full_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{post.author.full_name}</span>
                </div>
              </div>
            )}

            {/* Date */}
            {publishedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{publishedDate}</span>
              </div>
            )}

            {/* Reading Time */}
            {post.reading_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{post.reading_time_minutes} min de leitura</span>
              </div>
            )}

            {/* Views */}
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.total_views} visualizações</span>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Curtir */}
        <div className="mt-8">
          <LikeButton
            postId={post.id}
            returnPath={`/blog/${slug}`}
            initialLikes={post.total_likes}
            initialLiked={initialLiked}
            isLoggedIn={Boolean(user)}
          />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="my-12 border-t" />

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-bold">Posts Relacionados</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </section>
        )}
      </article>
    </PublicLayout>
  )
}
