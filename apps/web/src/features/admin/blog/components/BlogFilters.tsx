'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { BlogFilters as BlogFiltersType, PostStatus, BlogCategory } from '../types'
import { useStableCallback } from '@/shared/hooks/useStableCallback'

interface BlogFiltersProps {
  filters: BlogFiltersType
  categories: BlogCategory[]
  onFiltersChange: (filters: BlogFiltersType) => void
  resultsCount?: number
}

export function BlogFilters({
  filters,
  categories,
  onFiltersChange,
  resultsCount,
}: BlogFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTerm)

  // Debounce para busca (300ms)
  const applySearch = useStableCallback((term: string) => {
    if (term !== filters.searchTerm) {
      onFiltersChange({ ...filters, searchTerm: term })
    }
  })

  useEffect(() => {
    const timer = setTimeout(() => applySearch(searchInput), 300)

    return () => clearTimeout(timer)
  }, [searchInput, applySearch])

  const handleClearFilters = () => {
    setSearchInput('')
    onFiltersChange({
      searchTerm: '',
      status: 'ALL',
      categoryId: 'ALL',
      authorId: 'ALL',
      isFeatured: undefined,
    })
  }

  const hasActiveFilters =
    filters.searchTerm !== '' ||
    filters.status !== 'ALL' ||
    filters.categoryId !== 'ALL' ||
    filters.isFeatured === true

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
          />
          <Input
            type="text"
            placeholder="Buscar por título, conteúdo ou tags..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as PostStatus | 'ALL' })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.categoryId}
          onValueChange={(value) => onFiltersChange({ ...filters, categoryId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as Categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name} ({category.postsCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Segunda linha: Featured checkbox, contador e botão limpar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Checkbox Featured */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={filters.isFeatured === true}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, isFeatured: checked === true ? true : undefined })
              }
            />
            <Label htmlFor="featured" className="cursor-pointer text-sm">
              Apenas em destaque
            </Label>
          </div>

          {/* Contador de resultados */}
          {resultsCount !== undefined && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {resultsCount} {resultsCount === 1 ? 'post encontrado' : 'posts encontrados'}
            </div>
          )}
        </div>

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X size={16} className="mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
