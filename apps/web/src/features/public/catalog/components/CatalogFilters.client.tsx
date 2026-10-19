// =====================================================
// CATALOG FILTERS - CLIENT COMPONENT
// =====================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Label } from '@/shared/components/ui/label'
import type { CategoryOption } from '../types'

interface CatalogFiltersProps {
  categories: CategoryOption[]
}

export function CatalogFilters({ categories }: CatalogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/catalog?${params.toString()}`)
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/catalog?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push('/catalog')
  }

  const hasFilters =
    searchParams.get('search') ||
    searchParams.get('category') ||
    searchParams.get('level') ||
    searchParams.get('rating') ||
    searchParams.get('sortBy')

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar cursos"
          placeholder="Buscar cursos..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-semibold">Filtros</span>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-auto p-0 text-xs"
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="catalog-category">Categoria</Label>
          <Select
            defaultValue={searchParams.get('category') || 'all'}
            onValueChange={(value) => handleFilter('category', value)}
          >
            <SelectTrigger id="catalog-category">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name} ({cat.course_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <Label htmlFor="catalog-level">Nível</Label>
          <Select
            defaultValue={searchParams.get('level') || 'all'}
            onValueChange={(value) => handleFilter('level', value)}
          >
            <SelectTrigger id="catalog-level">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="beginner">Iniciante</SelectItem>
              <SelectItem value="intermediate">Intermediário</SelectItem>
              <SelectItem value="advanced">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <Label htmlFor="catalog-rating">Avaliação Mínima</Label>
          <Select
            defaultValue={searchParams.get('rating') || 'all'}
            onValueChange={(value) => handleFilter('rating', value)}
          >
            <SelectTrigger id="catalog-rating">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="4">4+ estrelas</SelectItem>
              <SelectItem value="4.5">4.5+ estrelas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label htmlFor="catalog-sort">Ordenar por</Label>
          <Select
            defaultValue={searchParams.get('sortBy') || 'newest'}
            onValueChange={(value) => handleFilter('sortBy', value)}
          >
            <SelectTrigger id="catalog-sort">
              <SelectValue placeholder="Mais recentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="popular">Mais populares</SelectItem>
              <SelectItem value="rating">Melhor avaliados</SelectItem>
              <SelectItem value="price_low">Menor preço</SelectItem>
              <SelectItem value="price_high">Maior preço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
