// =====================================================
// PRODUCER REVIEWS - FILTERS (Client Component)
// =====================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Button } from '@/shared/components/ui/button'
import { Star } from 'lucide-react'

interface Course {
  id: string
  title: string
}

interface ReviewFiltersProps {
  courses: Course[]
}

export function ReviewFilters({ courses }: ReviewFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCourse = searchParams.get('courseId') || 'all'
  const currentFilter = searchParams.get('filter') || 'all'

  const handleCourseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('courseId')
    } else {
      params.set('courseId', value)
    }
    router.push(`?${params.toString()}`)
  }

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('filter')
    } else {
      params.set('filter', value)
    }
    router.push(`?${params.toString()}`)
  }

  const handleReset = () => {
    router.push('/producer/reviews')
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Select value={currentCourse} onValueChange={handleCourseChange}>
        <SelectTrigger className="w-full sm:w-[250px]">
          <SelectValue placeholder="Selecione um curso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Cursos</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Filtrar por nota" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Notas</SelectItem>
          <SelectItem value="5">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />5 Estrelas
            </div>
          </SelectItem>
          <SelectItem value="4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />4 Estrelas
            </div>
          </SelectItem>
          <SelectItem value="3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />3 Estrelas
            </div>
          </SelectItem>
          <SelectItem value="2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />2 Estrelas
            </div>
          </SelectItem>
          <SelectItem value="1">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />1 Estrela
            </div>
          </SelectItem>
          <SelectItem value="no-response">Sem Resposta</SelectItem>
        </SelectContent>
      </Select>

      {(currentCourse !== 'all' || currentFilter !== 'all') && (
        <Button variant="outline" onClick={handleReset}>
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
