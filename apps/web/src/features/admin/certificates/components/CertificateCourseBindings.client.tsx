'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { useToast } from '@/shared/hooks/use-toast'
import { bindCertificateTemplateAction } from '../actions/certificate-course-actions'
import type { AdminCertificateCourse } from '../services/certificateCourseService'
import type { AdminCertificateTemplate } from '../services/certificateTemplateService'

interface CertificateCourseBindingsProps {
  courses: AdminCertificateCourse[]
  templates: AdminCertificateTemplate[]
}

/** Quem conclui um curso só recebe certificado se houver um modelo publicado ligado a ele. */
export function CertificateCourseBindings({ courses, templates }: CertificateCourseBindingsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [choices, setChoices] = useState<Record<number, string>>({})
  const publishedTemplates = templates.filter((template) => template.status === 'published')

  const handleBind = (course: AdminCertificateCourse) => {
    const templateId = choices[course.id]
    if (!templateId) return

    startTransition(async () => {
      const result = await bindCertificateTemplateAction({ courseId: course.id, templateId })
      if (!result.success) {
        toast({
          title: 'Erro ao ligar o template',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Template ligado ao curso',
        description: `Quem concluir "${course.title}" passa a receber este certificado.`,
      })
      setChoices((current) => ({ ...current, [course.id]: '' }))
      router.refresh()
    })
  }

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Template de cada curso
        </CardTitle>
        <CardDescription>
          Escolha um template publicado para cada curso. Curso sem template não emite certificado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Nenhum curso aprovado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Template atual</TableHead>
                <TableHead>Trocar para</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{course.templateName ?? 'Sem template'}</TableCell>
                  <TableCell>
                    <Select
                      value={choices[course.id] ?? ''}
                      onValueChange={(value) =>
                        setChoices((current) => ({ ...current, [course.id]: value }))
                      }
                    >
                      <SelectTrigger
                        className="w-64"
                        aria-label={`Template para o curso ${course.title}`}
                      >
                        <SelectValue placeholder="Escolha um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishedTemplates.map((template) => (
                          <SelectItem key={template.id} value={String(template.id)}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleBind(course)}
                      disabled={isPending || !choices[course.id]}
                      aria-label={`Ligar template ao curso ${course.title}`}
                    >
                      Ligar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
