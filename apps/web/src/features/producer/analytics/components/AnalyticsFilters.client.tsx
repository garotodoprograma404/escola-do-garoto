// =====================================================
// PRODUCER ANALYTICS - FILTERS (Client Component)
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

interface Course {
  id: string
  title: string
}

interface AnalyticsFiltersProps {
  courses: Course[]
}

export function AnalyticsFilters({ courses }: AnalyticsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentCourse = searchParams.get('courseId') || 'all'
  const currentRange = searchParams.get('range') || '30d'

  const handleCourseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('courseId')
    } else {
      params.set('courseId', value)
    }
    router.push(`?${params.toString()}`)
  }

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`?${params.toString()}`)
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

      <Select value={currentRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
          <SelectItem value="1y">Último ano</SelectItem>
          <SelectItem value="all">Todo período</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
