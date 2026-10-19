'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Badge } from '@/shared/components/ui/badge'

type CategoryStatusFilter = 'ALL' | 'active' | 'inactive'

interface CategoryFiltersProps {
  onFilterChange: (filters: {
    searchTerm: string
    status: CategoryStatusFilter
    isFeatured: boolean | null
  }) => void
  totalCount: number
  filteredCount: number
}

export function CategoryFilters({
  onFilterChange,
  totalCount,
  filteredCount,
}: CategoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<CategoryStatusFilter>('ALL')
  const [isFeatured, setIsFeatured] = useState<boolean | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Notificar mudanças de filtro
  useEffect(() => {
    onFilterChange({
      searchTerm: debouncedSearch,
      status,
      isFeatured,
    })
  }, [debouncedSearch, status, isFeatured, onFilterChange])

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setStatus('ALL')
    setIsFeatured(null)
  }, [])

  const hasActiveFilters = searchTerm || status !== 'ALL' || isFeatured !== null
  const isFiltering = filteredCount !== totalCount

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Linha 1: Busca e Status */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Busca */}
        <div className="relative flex-1 md:max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status */}
        <Select value={status} onValueChange={(value) => setStatus(value as CategoryStatusFilter)}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os Status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>

        {/* Featured */}
        <Select
          value={isFeatured === null ? 'ALL' : isFeatured ? 'true' : 'false'}
          onValueChange={(value) => {
            if (value === 'ALL') setIsFeatured(null)
            else setIsFeatured(value === 'true')
          }}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Destaque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="true">Em Destaque</SelectItem>
            <SelectItem value="false">Não Destacados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Linha 2: Contador e Limpar Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFiltering && (
            <Badge variant="secondary" className="text-xs">
              <Filter size={12} className="mr-1" />
              {filteredCount} de {totalCount} categorias
            </Badge>
          )}
          {!isFiltering && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {totalCount} {totalCount === 1 ? 'categoria' : 'categorias'}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X size={14} className="mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
