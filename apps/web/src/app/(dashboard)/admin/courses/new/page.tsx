import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { AdminCourseWizard } from '@/features/admin/courses/components/AdminCourseWizard.client'

export const metadata = {
  title: 'Criar Novo Curso (Admin)',
  description: 'Crie um novo curso com acesso completo de administração',
}

export default async function AdminNewCoursePage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('admin')) {
    redirect('/admin/courses')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/courses">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Criar Novo Curso (Admin)
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Mesmo fluxo completo do produtor com configurações administrativas.
          </p>
        </div>
      </div>

      <AdminCourseWizard
        mode="create"
        adminIdentity={{
          id: authContext.userId,
          name: authContext.profile?.full_name || authContext.email,
          email: authContext.email,
        }}
      />
    </div>
  )
}
