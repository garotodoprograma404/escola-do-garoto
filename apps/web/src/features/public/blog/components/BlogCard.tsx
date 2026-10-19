// =====================================================
// BLOG CARD - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, Eye, User } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import type { BlogPost } from '../types'

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
        {post.featured_image_url ? (
          <Image
            src={post.featured_image_url}
            alt={post.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Sem imagem</span>
          </div>
        )}

        {/* Featured Badge */}
        {post.is_featured && (
          <div className="absolute left-3 top-3">
            <Badge variant="default">Destaque</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Category */}
        {post.category && (
          <Badge variant="secondary" className="mb-3 w-fit">
            {post.category}
          </Badge>
        )}

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-xl font-bold group-hover:text-primary">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Author */}
          {post.author && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{post.author.full_name}</span>
            </div>
          )}

          {/* Date */}
          {publishedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{publishedDate}</span>
            </div>
          )}

          {/* Reading Time */}
          {post.reading_time_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{post.reading_time_minutes} min</span>
            </div>
          )}

          {/* Views */}
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{post.total_views}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
