'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Filter, X } from 'lucide-react'
import { buildSearchHref } from '../lib/search-url'
import type { SearchFilters } from '../types'

interface SearchFiltersProps {
  /** Termo buscado: os filtros são aplicados a ele. */
  query: string
  filters: SearchFilters
  stats?: {
    courses: number
    producers: number
    blog_posts: number
  }
}

export function SearchFiltersComponent({ query, filters, stats }: SearchFiltersProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)

  const handleTypeChange = (type: 'course' | 'producer' | 'blog_post', checked: boolean) => {
    const currentTypes = localFilters.type || []
    const newTypes = checked ? [...currentTypes, type] : currentTypes.filter((t) => t !== type)

    setLocalFilters({ ...localFilters, type: newTypes.length > 0 ? newTypes : undefined })
  }

  const handlePriceChange = (values: number[]) => {
    setLocalFilters({
      ...localFilters,
      minPrice: values[0],
      maxPrice: values[1],
    })
  }

  const handleRatingChange = (value: string) => {
    setLocalFilters({
      ...localFilters,
      rating: value === 'all' ? undefined : parseFloat(value),
    })
  }

  const handleApply = () => {
    router.push(buildSearchHref(query, localFilters))
    setIsOpen(false)
  }

  const handleClear = () => {
    const clearedFilters: SearchFilters = {}
    setLocalFilters(clearedFilters)
    router.push(buildSearchHref(query, clearedFilters))
  }

  const hasActiveFilters =
    (localFilters.type && localFilters.type.length > 0) ||
    localFilters.minPrice !== undefined ||
    localFilters.maxPrice !== undefined ||
    localFilters.rating !== undefined

  return (
    <div>
      {/* Mobile Toggle */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-4 w-full md:hidden"
      >
        <Filter className="mr-2 h-4 w-4" />
        Filtros
        {hasActiveFilters && (
          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            Ativos
          </span>
        )}
      </Button>

      {/* Filters Panel */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="mr-1 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Resultado</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-course"
                    checked={localFilters.type?.includes('course')}
                    onCheckedChange={(checked) => handleTypeChange('course', checked as boolean)}
                  />
                  <label
                    htmlFor="type-course"
                    className="flex flex-1 cursor-pointer items-center justify-between text-sm"
                  >
                    <span>Cursos</span>
                    {stats && (
                      <span className="text-xs text-muted-foreground">({stats.courses})</span>
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-producer"
                    checked={localFilters.type?.includes('producer')}
                    onCheckedChange={(checked) => handleTypeChange('producer', checked as boolean)}
                  />
                  <label
                    htmlFor="type-producer"
                    className="flex flex-1 cursor-pointer items-center justify-between text-sm"
                  >
                    <span>Produtores</span>
                    {stats && (
                      <span className="text-xs text-muted-foreground">({stats.producers})</span>
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-blog"
                    checked={localFilters.type?.includes('blog_post')}
                    onCheckedChange={(checked) => handleTypeChange('blog_post', checked as boolean)}
                  />
                  <label
                    htmlFor="type-blog"
                    className="flex flex-1 cursor-pointer items-center justify-between text-sm"
                  >
                    <span>Blog</span>
                    {stats && (
                      <span className="text-xs text-muted-foreground">({stats.blog_posts})</span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Price Range */}
            {(!localFilters.type || localFilters.type.includes('course')) && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Faixa de Preço</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={1000}
                    step={10}
                    value={[localFilters.minPrice || 0, localFilters.maxPrice || 1000]}
                    onValueChange={handlePriceChange}
                    className="mb-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>R$ {localFilters.minPrice || 0}</span>
                    <span>R$ {localFilters.maxPrice || 1000}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rating Filter */}
            {(!localFilters.type || localFilters.type.includes('course')) && (
              <div className="space-y-3">
                <Label htmlFor="rating" className="text-sm font-medium">
                  Avaliação Mínima
                </Label>
                <Select
                  value={localFilters.rating?.toString() || 'all'}
                  onValueChange={handleRatingChange}
                >
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                    <SelectItem value="4.0">4.0+ ⭐</SelectItem>
                    <SelectItem value="3.5">3.5+ ⭐</SelectItem>
                    <SelectItem value="3.0">3.0+ ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Apply Button (Mobile) */}
            <Button onClick={handleApply} className="w-full md:hidden">
              Aplicar Filtros
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
