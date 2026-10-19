import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { AdminCourseWizard } from '@/features/admin/courses/components/AdminCourseWizard.client'
import { getCourseForAdminEdit } from '@/features/admin/courses/services/courseService'

interface AdminEditCoursePageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Editar Curso (Admin)',
  description: 'Edite curso completo com permissões de administrador',
}

export default async function AdminEditCoursePage({ params }: AdminEditCoursePageProps) {
  const { id: courseId } = await params

  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('admin')) {
    redirect('/admin/courses')
  }

  const courseEditorData = await getCourseForAdminEdit(courseId)
  if (!courseEditorData) {
    redirect('/admin/courses')
  }

  const initialOwnerMode = courseEditorData.producerId === authContext.userId ? 'self' : 'producer'

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
            Editar Curso (Admin)
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Edição completa do curso com currículo, aulas e configurações administrativas.
          </p>
        </div>
      </div>

      <AdminCourseWizard
        mode="edit"
        courseId={courseId}
        initialData={courseEditorData.courseData}
        initialSettings={{
          ownerMode: initialOwnerMode,
          producerId: courseEditorData.producerId,
          isFeatured: courseEditorData.settings.isFeatured,
          couponsEnabled: courseEditorData.settings.couponsEnabled,
          priceLockedByAdmin: courseEditorData.settings.priceLockedByAdmin,
          adminNotes: courseEditorData.settings.adminNotes,
        }}
        adminIdentity={{
          id: authContext.userId,
          name: authContext.profile?.full_name || authContext.email,
          email: authContext.email,
        }}
      />
    </div>
  )
}
