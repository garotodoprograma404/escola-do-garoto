// =====================================================
// STUDENT QUESTIONS - FILTERS
// =====================================================

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Search, Filter } from 'lucide-react'
import type { QuestionStatusFilter, StudentQuestionCourseFilter } from '../types'

interface QuestionsFiltersProps {
  courses: StudentQuestionCourseFilter[]
}

export function QuestionsFilters({ courses }: QuestionsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const status = (searchParams.get('status') as QuestionStatusFilter) || 'all'
  const currentCourse = searchParams.get('course') || 'all'

  const updateQueryParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    updateQueryParams((params) => {
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
    })
  }

  const handleStatusChange = (value: string) => {
    updateQueryParams((params) => {
      if (value === 'all') {
        params.delete('status')
      } else {
        params.set('status', value)
      }
    })
  }

  const handleCourseChange = (value: string) => {
    updateQueryParams((params) => {
      if (value === 'all') {
        params.delete('course')
      } else {
        params.set('course', value)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por pergunta ou resposta..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="answered">Respondidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select value={currentCourse} onValueChange={handleCourseChange}>
        <SelectTrigger className="w-full sm:w-[260px]">
          <SelectValue placeholder="Filtrar por curso" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os cursos</SelectItem>
          {courses.map((course) => (
            <SelectItem key={course.id} value={course.id}>
              {course.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
