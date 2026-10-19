import { Suspense } from 'react'
import { SearchBar } from '@/features/search/components/SearchBar.client'
import { SearchResults } from '@/features/search/components/SearchResults'
import { SearchFiltersComponent } from '@/features/search/components/SearchFilters.client'
import {
  globalSearch,
  getSearchStats,
  getSearchSuggestions,
} from '@/features/search/services/searchService'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { SearchFilters, SearchResultType } from '@/features/search/types'

export const metadata = {
  title: 'Busca',
  description: 'Busque por cursos, produtores e conteúdo',
}

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    minPrice?: string
    maxPrice?: string
    rating?: string
  }>
}

const SEARCH_TYPES: SearchResultType[] = ['course', 'producer', 'blog_post']

function parseSearchTypes(rawType?: string): SearchResultType[] | undefined {
  if (!rawType) return undefined

  const parsed = rawType
    .split(',')
    .filter((type): type is SearchResultType => SEARCH_TYPES.includes(type as SearchResultType))

  return parsed.length > 0 ? parsed : undefined
}

async function SearchContent({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q || ''

  if (!query || query.trim().length < 2) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 text-3xl font-bold">Buscar</h1>
          <SearchBar />
          <div className="mt-12 text-center text-muted-foreground">
            <p>Digite pelo menos 2 caracteres para buscar</p>
          </div>
        </div>
      </div>
    )
  }

  // Parse filters from URL
  const filters: SearchFilters = {
    type: parseSearchTypes(resolvedSearchParams.type),
    minPrice: resolvedSearchParams.minPrice ? parseFloat(resolvedSearchParams.minPrice) : undefined,
    maxPrice: resolvedSearchParams.maxPrice ? parseFloat(resolvedSearchParams.maxPrice) : undefined,
    rating: resolvedSearchParams.rating ? parseFloat(resolvedSearchParams.rating) : undefined,
  }

  // Fetch data
  const [results, stats, suggestions] = await Promise.all([
    globalSearch(query, filters),
    getSearchStats(query),
    getSearchSuggestions(query),
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-4 text-3xl font-bold">Resultados da Busca</h1>
        <SearchBar initialQuery={query} suggestions={suggestions} />
      </div>

      {/* Stats */}
      <div className="mb-6">
        <p className="text-muted-foreground">
          {stats.total} resultado{stats.total !== 1 ? 's' : ''} encontrado
          {stats.total !== 1 ? 's' : ''} para <strong>&quot;{query}&quot;</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Filters Sidebar */}
        <div className="md:col-span-1">
          <SearchFiltersComponent query={query} filters={filters} stats={stats} />
        </div>

        {/* Results */}
        <div className="md:col-span-3">
          <SearchResults results={results} query={query} />
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="h-12 w-full max-w-2xl" />
      </div>
      <Skeleton className="mb-6 h-6 w-48" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 md:col-span-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage(props: SearchPageProps) {
  return (
    <PublicLayout>
      <Suspense fallback={<LoadingSkeleton />}>
        <SearchContent {...props} />
      </Suspense>
    </PublicLayout>
  )
}
