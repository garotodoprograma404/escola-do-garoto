import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { CourseWizard } from '@/features/producer/course-create/components/CourseWizard.client'
import { apiServer } from '@/lib/server-api'
import { normalizePlatformCommissionRate } from '@/shared/lib/commission'

export const metadata = {
  title: 'Criar Novo Curso',
  description: 'Crie um novo curso na plataforma',
}

export default async function NewCoursePage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/become-producer')
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
            Criar Novo Curso
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Siga os passos para criar seu curso
          </p>
        </div>
      </div>

      {/* Wizard */}
      <CourseWizard platformCommissionRate={platformCommissionRate} />
    </div>
  )
}
