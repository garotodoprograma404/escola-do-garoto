// =====================================================
// STUDENT COURSE LIST - CLIENT COMPONENT
// =====================================================

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { CourseCard } from './CourseCard'
import { CourseTabs } from './CourseTabs.client'
import { CourseFilters } from './CourseFilters.client'
import { Button } from '@/shared/components/ui/button'
import type { StudentCourse, CourseStatus } from '../types'

interface CourseListProps {
  courses: StudentCourse[]
}

export function CourseList({ courses }: CourseListProps) {
  const [activeTab, setActiveTab] = useState<CourseStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'progress' | 'title'>('recent')

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    let filtered = courses

    // Filter by tab
    if (activeTab === 'in_progress') {
      filtered = filtered.filter((c) => !c.isCompleted)
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((c) => c.isCompleted)
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.producerName.toLowerCase().includes(term) ||
          c.categoryName.toLowerCase().includes(term),
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.lastAccessedAt || a.enrolledAt).getTime()
        const dateB = new Date(b.lastAccessedAt || b.enrolledAt).getTime()
        return dateB - dateA
      } else if (sortBy === 'progress') {
        return b.progressPercentage - a.progressPercentage
      } else {
        return a.title.localeCompare(b.title)
      }
    })

    return filtered
  }, [courses, activeTab, searchTerm, sortBy])

  // Stats for tabs
  const stats = {
    all: courses.length,
    inProgress: courses.filter((c) => !c.isCompleted).length,
    completed: courses.filter((c) => c.isCompleted).length,
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Tabs */}
      <CourseTabs activeTab={activeTab} onTabChange={setActiveTab} stats={stats} />

      {/* Filters */}
      <CourseFilters
        searchTerm={searchTerm}
        sortBy={sortBy}
        onSearchChange={setSearchTerm}
        onSortChange={setSortBy}
      />

      {/* Course Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Nenhum curso encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? 'Tente ajustar sua busca'
              : activeTab === 'completed'
                ? 'Você ainda não concluiu nenhum curso'
                : 'Você ainda não está matriculado em nenhum curso'}
          </p>
          {!searchTerm && activeTab === 'all' && (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/catalogo">Explorar catálogo</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/catalogo?sortBy=price_low">Ver cursos em oferta</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
