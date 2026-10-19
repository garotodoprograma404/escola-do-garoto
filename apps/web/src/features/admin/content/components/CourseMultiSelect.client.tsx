'use client'

import { useState, useEffect } from 'react'
import { Search, X, Check, Package } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import type { CourseOption } from '../services/courseService'

interface CourseMultiSelectProps {
  selectedCourseIds: string[]
  onSelectionChange: (courseIds: string[]) => void
  availableCourses: CourseOption[]
  selectedCourses: CourseOption[]
  onSearch: (term: string) => void
  isLoading?: boolean
}

export function CourseMultiSelect({
  selectedCourseIds,
  onSelectionChange,
  availableCourses,
  selectedCourses,
  onSearch,
  isLoading = false,
}: CourseMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, onSearch])

  const handleToggleCourse = (courseId: string) => {
    const isSelected = selectedCourseIds.includes(courseId)

    if (isSelected) {
      onSelectionChange(selectedCourseIds.filter((id) => id !== courseId))
    } else {
      onSelectionChange([...selectedCourseIds, courseId])
    }
  }

  const handleRemoveCourse = (courseId: string) => {
    onSelectionChange(selectedCourseIds.filter((id) => id !== courseId))
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  return (
    <div className="space-y-3">
      {/* Selected Courses */}
      {selectedCourses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Cursos Selecionados ({selectedCourses.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCourses.map((course) => (
              <Badge key={course.id} variant="secondary" className="py-1.5 pl-3 pr-1 text-sm">
                <span className="mr-2">{course.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCourse(course.id)}
                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  <X size={14} />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
          size={18}
        />
        <Input
          type="text"
          placeholder="Buscar cursos por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="relative">
          <div className="absolute left-0 right-0 top-0 z-50 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selecione os cursos
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Carregando cursos...
                  </p>
                </div>
              ) : availableCourses.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="mx-auto mb-2 text-slate-600 dark:text-slate-400" size={32} />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {searchTerm ? 'Nenhum curso encontrado' : 'Nenhum curso disponível'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {availableCourses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id)

                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => handleToggleCourse(course.id)}
                        className={`flex w-full items-start gap-3 rounded-lg p-3 transition-colors ${
                          isSelected
                            ? 'border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        } `}
                      >
                        {/* Checkbox */}
                        <div
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500'
                              : 'border-slate-300 dark:border-slate-600'
                          } `}
                        >
                          {isSelected && <Check size={14} className="text-black" />}
                        </div>

                        {/* Course Info */}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {course.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {course.producerName}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">•</span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {course.categoryName}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                            {formatPrice(course.price)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}
