import { CertificatesManagement } from '@/features/admin/certificates/components/CertificatesManagement.client'
import { CertificateCourseBindings } from '@/features/admin/certificates/components/CertificateCourseBindings.client'
import { CertificateOperationsManagement } from '@/features/admin/certificates/components/CertificateOperationsManagement.client'
import { ManualCertificateIssue } from '@/features/admin/certificates/components/ManualCertificateIssue.client'
import { getAdminCertificateCourses } from '@/features/admin/certificates/services/certificateCourseService'
import { getAdminCertificateOperationsData } from '@/features/admin/certificates/services/certificateOperationsService'
import { getAdminCertificateTemplates } from '@/features/admin/certificates/services/certificateTemplateService'

export default async function AdminCertificatesPage() {
  const [templates, courses, operationsData] = await Promise.all([
    getAdminCertificateTemplates(),
    getAdminCertificateCourses(),
    getAdminCertificateOperationsData(),
  ])

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Certificados</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Crie e publique templates, ligue cada template aos cursos e acompanhe os certificados
          emitidos.
        </p>
      </header>

      <CertificatesManagement templates={templates} />

      <CertificateCourseBindings courses={courses} templates={templates} />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Operação de certificados emitidos
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Emita manualmente, revogue, reemita e acompanhe a trilha de auditoria dos certificados
            por matrícula.
          </p>
        </div>

        <ManualCertificateIssue courses={courses} />

        <CertificateOperationsManagement
          certificates={operationsData.certificates}
          events={operationsData.events}
        />
      </section>
    </div>
  )
}
