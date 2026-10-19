// =====================================================
// CATALOG PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { CatalogFilters } from '@/features/public/catalog/components/CatalogFilters.client'
import { CourseGrid } from '@/features/public/catalog/components/CourseGrid'
import { CatalogPagination } from '@/features/public/catalog/components/CatalogPagination.client'
import { getCatalogCourses, getCategoriesForFilter } from '@/features/public/catalog'
import type { CatalogFilters as Filters } from '@/features/public/catalog/types'

export const metadata = {
  title: 'Catálogo de Cursos',
  description:
    'Explore nossa biblioteca completa de cursos online. Encontre o curso perfeito para você.',
}

interface CatalogPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    level?: string
    rating?: string
    sortBy?: string
    page?: string
  }>
}

const CATALOG_LEVELS: NonNullable<Filters['level']>[] = ['beginner', 'intermediate', 'advanced']
const CATALOG_SORTS: NonNullable<Filters['sortBy']>[] = [
  'newest',
  'popular',
  'price_low',
  'price_high',
  'rating',
]

function parseCatalogLevel(level?: string): Filters['level'] {
  if (level && CATALOG_LEVELS.includes(level as NonNullable<Filters['level']>)) {
    return level as NonNullable<Filters['level']>
  }
  return undefined
}

function parseCatalogSort(sortBy?: string): Filters['sortBy'] {
  if (sortBy && CATALOG_SORTS.includes(sortBy as NonNullable<Filters['sortBy']>)) {
    return sortBy as NonNullable<Filters['sortBy']>
  }
  return undefined
}

async function CatalogContent({ searchParams }: CatalogPageProps) {
  // Next.js 16: searchParams é Promise, precisa await
  const params = await searchParams

  const filters: Filters = {
    search: params.search,
    category: params.category,
    level: parseCatalogLevel(params.level),
    rating: params.rating ? parseFloat(params.rating) : undefined,
    sortBy: parseCatalogSort(params.sortBy),
    page: params.page ? parseInt(params.page) : 1,
    limit: 12,
  }

  const [result, categories] = await Promise.all([
    getCatalogCourses(filters),
    getCategoriesForFilter(),
  ])

  return (
    <>
      {/* Sidebar */}
      <aside className="lg:w-64">
        <div className="sticky top-4">
          <CatalogFilters categories={categories} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Cursos</h1>
          <p className="mt-2 text-muted-foreground">
            {result.total} curso{result.total !== 1 ? 's' : ''} encontrado
            {result.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Course Grid */}
        <CourseGrid courses={result.courses} />

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="flex justify-center pt-8">
            <CatalogPagination currentPage={result.page} totalPages={result.totalPages} />
          </div>
        )}
      </div>
    </>
  )
}

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  return (
    <PublicLayout>
      <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <Suspense
              fallback={
                <>
                  <aside className="lg:w-64">
                    <Skeleton className="h-96" />
                  </aside>
                  <div className="flex-1 space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-96" />
                      ))}
                    </div>
                  </div>
                </>
              }
            >
              <CatalogContent searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
