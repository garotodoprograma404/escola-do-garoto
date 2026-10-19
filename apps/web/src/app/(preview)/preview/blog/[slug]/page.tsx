import { notFound } from 'next/navigation'
import Image from 'next/image'
import { AlertTriangle } from 'lucide-react'
import { apiServer } from '@/lib/server-api'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'

interface PreviewBlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

interface PreviewPostRow {
  title: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  category: string | null
  tags: string[] | null
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  reading_time_minutes: number | null
  author_name: string | null
  author_avatar_url: string | null
}

/** Pré-visualização: só admin (a API recusa os demais) e de qualquer status. */
async function getPostBySlug(slug: string) {
  const result = await apiServer<PreviewPostRow>(
    `/admin/blog/posts/by-slug/${encodeURIComponent(slug)}`,
  )

  if (!result.ok) {
    return null
  }

  const post = result.data
  return {
    ...post,
    author: {
      name: post.author_name || 'Autor Desconhecido',
      avatar: post.author_avatar_url || null,
    },
  }
}

export default async function PreviewBlogPostPage({ params }: PreviewBlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-yellow-500 px-4 py-3 text-black shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">MODO PREVIEW</span>
          <span className="hidden sm:inline">- Esta é uma visualização do post</span>
        </div>
      </div>

      {/* Post Content */}
      <article className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          {post.category && (
            <div className="mb-4">
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                {post.category}
              </span>
            </div>
          )}

          <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mb-6 text-xl text-slate-600 dark:text-slate-400">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              {post.author.avatar && (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <span className="font-medium">{post.author.name}</span>
            </div>

            {post.published_at && (
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}

            {post.reading_time_minutes && <span>{post.reading_time_minutes} min de leitura</span>}
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="mb-8">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              width={1200}
              height={675}
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="h-auto w-full rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* Status Alert */}
        {post.status !== 'published' && (
          <Alert className="mb-8">
            <AlertDescription>
              <strong>Status:</strong> {post.status === 'draft' ? 'Rascunho' : 'Arquivado'} - Este
              post não está visível publicamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <div
          className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-strong:text-slate-900 dark:prose-strong:text-white prose-code:text-brand-600 dark:prose-code:text-brand-400 prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-img:rounded-lg prose-img:shadow-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
