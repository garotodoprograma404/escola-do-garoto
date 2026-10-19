import { notFound } from 'next/navigation'
import { CertificateTemplateBuilder } from '@/features/admin/certificates/components/CertificateTemplateBuilder.client'
import { getAdminCertificateTemplateBuilderData } from '@/features/admin/certificates/services/certificateBuilderService'

interface AdminCertificateBuilderPageProps {
  params: Promise<{ templateId: string }>
}

export default async function AdminCertificateBuilderPage({
  params,
}: AdminCertificateBuilderPageProps) {
  const { templateId } = await params
  const parsedTemplateId = Number.parseInt(templateId, 10)

  if (!Number.isFinite(parsedTemplateId) || parsedTemplateId <= 0) {
    notFound()
  }

  const templateData = await getAdminCertificateTemplateBuilderData(parsedTemplateId)

  if (!templateData) {
    notFound()
  }

  return <CertificateTemplateBuilder data={templateData} />
}
