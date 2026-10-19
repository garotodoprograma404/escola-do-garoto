import { Suspense } from 'react'
import { CourseManagementContent } from '@/features/admin/courses/components/CourseManagementContent.client'

function CoursesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function AdminCoursesPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Gestão de Cursos</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Crie, aprove, edite e mantenha os cursos da plataforma.
        </p>
      </div>

      {/* Content */}
      <Suspense fallback={<CoursesSkeleton />}>
        <CourseManagementContent />
      </Suspense>
    </div>
  )
}
