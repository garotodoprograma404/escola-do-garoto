// =====================================================
// COURSE PREVIEW PAGE - ADMIN AUDIT MODE
// =====================================================

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Eye } from 'lucide-react'
import { CourseHero } from '@/features/public/course-detail/components/CourseHero'
import { CourseCurriculum } from '@/features/public/course-detail/components/CourseCurriculum'
import { getCourseById } from '@/features/admin/courses/actions/get-course-preview'

interface PreviewPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const { id } = await params
  const course = await getCourseById(id)

  if (!course) {
    return {
      title: 'Curso não encontrado',
    }
  }

  return {
    title: `[PREVIEW] ${course.title}`,
    description: 'Modo de visualização para auditoria',
  }
}

async function PreviewContent({ id }: { id: string }) {
  const course = await getCourseById(id)

  if (!course) {
    notFound()
  }

  return (
    <>
      {/* Preview Banner */}
      <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 dark:bg-amber-950/20">
        <Eye className="h-4 w-4" />
        <AlertDescription className="text-center font-medium">
          MODO PREVIEW - AUDITORIA | Este é o modo de visualização para moderação. Os alunos verão o
          curso exatamente desta forma após aprovação.
        </AlertDescription>
      </Alert>

      <CourseHero course={course} isPreview />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <CourseCurriculum modules={course.modules} />
        </div>
      </div>
    </>
  )
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params

  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-96 w-full" />
            <div className="mx-auto max-w-7xl px-4 py-12">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        }
      >
        <PreviewContent id={id} />
      </Suspense>
    </main>
  )
}
