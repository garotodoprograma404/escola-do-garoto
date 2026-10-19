import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CourseFilters } from '@/features/producer/courses/components/CourseFilters.client'
import { CourseCard } from '@/features/producer/courses/components/CourseCard'
import { getProducerCourses } from '@/features/producer/courses/services/courseService'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import type { CourseFilters as CourseFiltersType } from '@/features/producer/courses/types'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }>
}

const COURSE_STATUSES: NonNullable<CourseFiltersType['status']>[] = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived',
]
const COURSE_SORT_FIELDS: NonNullable<CourseFiltersType['sortBy']>[] = [
  'created_at',
  'title',
  'students',
  'revenue',
]
const COURSE_SORT_DIRECTIONS: NonNullable<CourseFiltersType['sortOrder']>[] = ['asc', 'desc']

function parseCourseStatus(status?: string): CourseFiltersType['status'] {
  if (status && COURSE_STATUSES.includes(status as NonNullable<CourseFiltersType['status']>)) {
    return status as NonNullable<CourseFiltersType['status']>
  }
  return undefined
}

function parseCourseSortBy(sortBy?: string): NonNullable<CourseFiltersType['sortBy']> {
  if (sortBy && COURSE_SORT_FIELDS.includes(sortBy as NonNullable<CourseFiltersType['sortBy']>)) {
    return sortBy as NonNullable<CourseFiltersType['sortBy']>
  }
  return 'created_at'
}

function parseCourseSortOrder(sortOrder?: string): NonNullable<CourseFiltersType['sortOrder']> {
  if (
    sortOrder &&
    COURSE_SORT_DIRECTIONS.includes(sortOrder as NonNullable<CourseFiltersType['sortOrder']>)
  ) {
    return sortOrder as NonNullable<CourseFiltersType['sortOrder']>
  }
  return 'desc'
}

async function CoursesList({ userId, filters }: { userId: string; filters: CourseFiltersType }) {
  const courses = await getProducerCourses(userId, filters)

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Plus size={32} className="text-slate-600 dark:text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">
          Nenhum curso encontrado
        </h3>
        <p className="mb-6 max-w-md text-slate-600 dark:text-slate-400">
          {filters.search || filters.status
            ? 'Tente ajustar os filtros de busca'
            : 'Comece criando seu primeiro curso e compartilhe seu conhecimento'}
        </p>
        {!filters.search && !filters.status && (
          <Button asChild>
            <Link href="/producer/courses/new">
              <Plus size={18} className="mr-2" />
              Criar Primeiro Curso
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  )
}

function CoursesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ProducerCoursesPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('producer')) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const filters: CourseFiltersType = {
    search: params.search,
    status: parseCourseStatus(params.status),
    sortBy: parseCourseSortBy(params.sortBy),
    sortOrder: parseCourseSortOrder(params.sortOrder),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Meus Cursos
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Gerencie seus cursos e acompanhe o desempenho
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/producer/courses/new">
            <Plus size={18} className="mr-2" />
            Criar Novo Curso
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <CourseFilters />

      {/* Courses List */}
      <Suspense fallback={<CoursesListSkeleton />}>
        <CoursesList userId={authContext.userId} filters={filters} />
      </Suspense>
    </div>
  )
}
