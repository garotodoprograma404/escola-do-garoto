'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
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
import type { ContentFilters, ContentStatus, BannerPosition, DateFilter } from '../types'

interface BannerFiltersProps {
  filters: ContentFilters
  onFiltersChange: (filters: ContentFilters) => void
  totalResults: number
}

export function BannerFilters({ filters, onFiltersChange, totalResults }: BannerFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTerm)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.searchTerm) {
        onFiltersChange({ ...filters, searchTerm: searchInput })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput, filters, onFiltersChange])

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value as ContentStatus | 'ALL' })
  }

  const handlePositionChange = (value: string) => {
    onFiltersChange({ ...filters, position: value as BannerPosition | 'ALL' })
  }

  const handleDateFilterChange = (value: string) => {
    onFiltersChange({ ...filters, dateFilter: value as DateFilter })
  }

  const clearFilters = () => {
    setSearchInput('')
    onFiltersChange({
      searchTerm: '',
      status: 'ALL',
      position: 'ALL',
      dateFilter: 'ALL',
    })
  }

  const hasActiveFilters =
    filters.searchTerm ||
    filters.status !== 'ALL' ||
    filters.position !== 'ALL' ||
    filters.dateFilter !== 'ALL'

  const activeFilterCount = [
    filters.searchTerm,
    filters.status !== 'ALL',
    filters.position !== 'ALL',
    filters.dateFilter !== 'ALL',
  ].filter(Boolean).length

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
            size={18}
          />
          <Input
            placeholder="Buscar por título ou subtítulo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showAdvanced ? 'default' : 'outline'}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-2"
          >
            <Filter size={16} />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X size={16} />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 dark:border-slate-800 md:grid-cols-2 lg:grid-cols-3">
          {/* Status Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Status
            </label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger aria-label="Filtrar por status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Posição
            </label>
            <Select value={filters.position || 'ALL'} onValueChange={handlePositionChange}>
              <SelectTrigger aria-label="Filtrar por posição">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="mid-page">Mid-Page</SelectItem>
                <SelectItem value="popup">Popup</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Data
            </label>
            <Select value={filters.dateFilter || 'ALL'} onValueChange={handleDateFilterChange}>
              <SelectTrigger aria-label="Filtrar por data">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="active-today">Ativos Hoje</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <span>
          {totalResults} {totalResults === 1 ? 'banner encontrado' : 'banners encontrados'}
        </span>
        {hasActiveFilters && <span className="text-xs">Filtros ativos: {activeFilterCount}</span>}
      </div>
    </div>
  )
}
