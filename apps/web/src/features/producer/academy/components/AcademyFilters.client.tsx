// =====================================================
// PRODUCER ACADEMY - FILTERS (CLIENT)
// =====================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { CategoryFilter, DifficultyFilter } from '../types'

export function AcademyFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = (searchParams.get('category') as CategoryFilter) || 'all'
  const currentDifficulty = (searchParams.get('difficulty') as DifficultyFilter) || 'all'

  const categories = [
    { value: 'all', label: 'Todas as Categorias' },
    { value: 'getting_started', label: 'Primeiros Passos' },
    { value: 'course_creation', label: 'Criação de Cursos' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'sales', label: 'Vendas' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'best_practices', label: 'Melhores Práticas' },
  ]

  const difficulties = [
    { value: 'all', label: 'Todos os Níveis' },
    { value: 'beginner', label: 'Iniciante' },
    { value: 'intermediate', label: 'Intermediário' },
    { value: 'advanced', label: 'Avançado' },
  ]

  const handleFilterChange = (type: 'category' | 'difficulty', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(type)
    } else {
      params.set(type, value)
    }
    router.push(`?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push('/producer/academy')
  }

  const hasFilters = currentCategory !== 'all' || currentDifficulty !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentCategory}
        onValueChange={(value) => handleFilterChange('category', value)}
      >
        <SelectTrigger className="w-[200px]" aria-label="Filtrar por categoria">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentDifficulty}
        onValueChange={(value) => handleFilterChange('difficulty', value)}
      >
        <SelectTrigger className="w-[180px]" aria-label="Filtrar por dificuldade">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {difficulties.map((diff) => (
            <SelectItem key={diff.value} value={diff.value}>
              {diff.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={handleClearFilters}>
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
