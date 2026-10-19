// =====================================================
// NOTES FILTERS - CLIENT COMPONENT
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
import { ArrowDownAZ, Search } from 'lucide-react'

interface NotesFiltersProps {
  courses: Array<{ id: string; title: string; slug: string }>
}

export function NotesFilters({ courses }: NotesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const currentSort = searchParams.get('sort') || 'recent'

  const updateQueryParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    mutate(params)
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const handleCourseChange = (courseId: string) => {
    updateQueryParams((params) => {
      if (courseId === 'all') {
        params.delete('course')
      } else {
        params.set('course', courseId)
      }
    })
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

  const handleSortChange = (sort: string) => {
    updateQueryParams((params) => {
      if (sort === 'recent') {
        params.delete('sort')
      } else {
        params.set('sort', sort)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar notas..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select defaultValue={searchParams.get('course') || 'all'} onValueChange={handleCourseChange}>
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

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <ArrowDownAZ className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigas</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
