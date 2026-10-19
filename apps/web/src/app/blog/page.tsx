// =====================================================
// BLOG LIST PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { BlogCard, BlogFilters, BlogPagination, getBlogPosts } from '@/features/public/blog'

export const metadata = {
  title: 'Blog',
  description: 'Artigos, dicas e novidades sobre educação online, criação de cursos e muito mais.',
}

interface BlogPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    page?: string
  }>
}

async function BlogContent({ searchParams }: BlogPageProps) {
  const params = await searchParams

  const filters = {
    category: params.category,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
    limit: 12,
  }

  const result = await getBlogPosts(filters)

  return (
    <>
      {/* Sidebar */}
      <aside className="lg:w-64">
        <div className="sticky top-4">
          <BlogFilters categories={result.categories} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="mt-2 text-muted-foreground">
            {result.total} post{result.total !== 1 ? 's' : ''} encontrado
            {result.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Posts Grid */}
        {result.posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {result.posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">Nenhum post encontrado</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente ajustar os filtros ou buscar por outro termo
            </p>
          </div>
        )}

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="flex justify-center pt-8">
            <BlogPagination currentPage={result.page} totalPages={result.totalPages} />
          </div>
        )}
      </div>
    </>
  )
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <Suspense
            fallback={
              <>
                <aside className="lg:w-64">
                  <Skeleton className="h-96" />
                </aside>
                <div className="flex-1 space-y-8">
                  <Skeleton className="h-12 w-64" />
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-96" />
                    ))}
                  </div>
                </div>
              </>
            }
          >
            <BlogContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </PublicLayout>
  )
}
