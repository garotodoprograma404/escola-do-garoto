import { apiServer } from '@/lib/server-api'

export interface AdminCertificateCourse {
  id: number
  title: string
  templateId: number | null
  templateName: string | null
}

export interface AdminCourseEnrollment {
  enrollmentId: number
  studentName: string
  status: string
  progressPercentage: number
  hasActiveCertificate: boolean
}

/** Cursos aprovados e o modelo de certificado ativo em cada um (só admin: a API confere o papel). */
export async function getAdminCertificateCourses(): Promise<AdminCertificateCourse[]> {
  const result = await apiServer<AdminCertificateCourse[]>('/certificates/courses')

  if (!result.ok) {
    console.error('Error loading courses for certificates:', result.error.statusCode)
    throw new Error('Não foi possível carregar os cursos')
  }

  return result.data
}
