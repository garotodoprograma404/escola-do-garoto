import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { CourseWizard } from '@/features/producer/course-create/components/CourseWizard.client'
import { getCourseForEdit } from '@/features/producer/courses'
import { apiServer } from '@/lib/server-api'
import { normalizePlatformCommissionRate } from '@/shared/lib/commission'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  await params

  return {
    title: `Editar Curso`,
    description: 'Edite as informações do seu curso',
  }
}

export default async function EditCoursePage({ params }: PageProps) {
  const { id: courseId } = await params
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/become-producer')
  }

  const courseData = await getCourseForEdit(courseId, authContext.userId)
  if (!courseData) {
    // Curso não encontrado ou sem permissão
    redirect('/producer/courses')
  }

  const commission = await apiServer<{ commission_rate: number | null }>(
    '/producer/courses/commission-rate',
  )
  const platformCommissionRate = normalizePlatformCommissionRate(
    commission.ok ? commission.data.commission_rate : null,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/producer/courses">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Editar Curso
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Atualize as informações do seu curso
          </p>
        </div>
      </div>

      {/* Wizard em modo edit */}
      <CourseWizard
        mode="edit"
        courseId={courseId}
        initialData={courseData}
        platformCommissionRate={platformCommissionRate}
      />
    </div>
  )
}
