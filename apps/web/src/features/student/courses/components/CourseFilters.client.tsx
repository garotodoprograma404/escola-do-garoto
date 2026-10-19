// =====================================================
// STUDENT COURSE FILTERS - CLIENT COMPONENT
// =====================================================

'use client'

import { Search, SortAsc } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

interface CourseFiltersProps {
  searchTerm: string
  sortBy: 'recent' | 'progress' | 'title'
  onSearchChange: (value: string) => void
  onSortChange: (value: 'recent' | 'progress' | 'title') => void
}

export function CourseFilters({
  searchTerm,
  sortBy,
  onSearchChange,
  onSortChange,
}: CourseFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sort */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <SortAsc className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as CourseFiltersProps['sortBy'])}
        >
          <SelectTrigger className="w-full sm:w-[180px]" aria-label="Ordenar cursos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais Recentes</SelectItem>
            <SelectItem value="progress">Maior Progresso</SelectItem>
            <SelectItem value="title">Nome (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
