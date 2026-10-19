// =====================================================
// PRODUCER Q&A - FILTERS (Client Component)
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

interface Course {
  id: string
  title: string
}

interface QnAFiltersProps {
  courses: Course[]
}

export function QnAFilters({ courses }: QnAFiltersProps) {
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
    router.push('/producer/qna')
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
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="answered">Respondidas</SelectItem>
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
