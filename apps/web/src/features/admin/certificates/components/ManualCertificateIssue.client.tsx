'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Award } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useToast } from '@/shared/hooks/use-toast'
import { issueCertificateForEnrollmentAction } from '../actions/certificate-issuance-actions'
import { getCourseEnrollmentsAction } from '../actions/certificate-course-actions'
import type {
  AdminCertificateCourse,
  AdminCourseEnrollment,
} from '../services/certificateCourseService'

interface ManualCertificateIssueProps {
  courses: AdminCertificateCourse[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'em andamento',
  completed: 'concluída',
  cancelled: 'cancelada',
  refunded: 'reembolsada',
}

function enrollmentLabel(enrollment: AdminCourseEnrollment) {
  const status = STATUS_LABELS[enrollment.status] ?? enrollment.status
  const base = `${enrollment.studentName} (${status}, ${enrollment.progressPercentage}%)`
  return enrollment.hasActiveCertificate ? `${base} - já tem certificado` : base
}

/** Emissão manual: para quem concluiu e ficou sem certificado (por exemplo, curso sem template na época). */
export function ManualCertificateIssue({ courses }: ManualCertificateIssueProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [courseId, setCourseId] = useState('')
  const [enrollmentId, setEnrollmentId] = useState('')
  const [enrollments, setEnrollments] = useState<AdminCourseEnrollment[]>([])

  const handleCourseChange = (value: string) => {
    setCourseId(value)
    setEnrollmentId('')
    setEnrollments([])

    startTransition(async () => {
      const result = await getCourseEnrollmentsAction(value)
      if (!result.success) {
        toast({
          title: 'Erro ao carregar as matrículas',
          description: result.error,
          variant: 'destructive',
        })
        return
      }
      setEnrollments(result.enrollments)
    })
  }

  const handleIssue = () => {
    startTransition(async () => {
      const result = await issueCertificateForEnrollmentAction({
        enrollmentId,
        source: 'admin_manual_action',
      })
      if (!result.success) {
        toast({
          title: 'Não foi possível emitir',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title:
          result.status === 'already_exists'
            ? 'O aluno já tinha certificado'
            : 'Certificado emitido',
        description: result.certificateCode ? `Código ${result.certificateCode}` : undefined,
      })
      setEnrollmentId('')
      const refreshed = await getCourseEnrollmentsAction(courseId)
      if (refreshed.success) setEnrollments(refreshed.enrollments)
      router.refresh()
    })
  }

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Emitir certificado manualmente
        </CardTitle>
        <CardDescription>
          Escolha o curso e a matrícula. Só emite se o aluno concluiu o curso e o curso tem um
          template publicado.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="manual-issue-course">Curso</Label>
          <Select value={courseId} onValueChange={handleCourseChange}>
            <SelectTrigger id="manual-issue-course">
              <SelectValue placeholder="Escolha o curso" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manual-issue-enrollment">Aluno</Label>
          <Select
            value={enrollmentId}
            onValueChange={setEnrollmentId}
            disabled={enrollments.length === 0}
          >
            <SelectTrigger id="manual-issue-enrollment">
              <SelectValue
                placeholder={courseId ? 'Escolha o aluno' : 'Escolha o curso primeiro'}
              />
            </SelectTrigger>
            <SelectContent>
              {enrollments.map((enrollment) => (
                <SelectItem key={enrollment.enrollmentId} value={String(enrollment.enrollmentId)}>
                  {enrollmentLabel(enrollment)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleIssue} disabled={isPending || !enrollmentId}>
          Emitir certificado
        </Button>
      </CardContent>
    </Card>
  )
}
