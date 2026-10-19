// =====================================================
// BLOG FILTERS - CLIENT COMPONENT
// =====================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

interface BlogFiltersProps {
  categories: string[]
}

export function BlogFilters({ categories }: BlogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category')
  const currentSearch = searchParams.get('search') || ''

  const handleCategoryChange = (category: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }

    params.delete('page') // Reset to page 1

    router.push(`/blog?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const search = formData.get('search') as string

    const params = new URLSearchParams(searchParams.toString())

    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }

    params.delete('page') // Reset to page 1

    router.push(`/blog?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <h3 className="mb-3 font-semibold">Buscar</h3>
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <Input name="search" placeholder="Buscar posts..." defaultValue={currentSearch} />
            <Button type="submit" size="icon" aria-label="Buscar posts">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Categorias</h3>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={!currentCategory ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleCategoryChange(null)}
            >
              Todas
            </Badge>

            {categories.map((category) => (
              <Badge
                key={category}
                variant={currentCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
