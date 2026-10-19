import Link from 'next/link'
import Image from 'next/image'
import { Eye, Edit, Users, DollarSign, Star } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import type { ProducerCourse } from '../types'
import { DeleteCourseButton } from '@/features/producer/courses/components/DeleteCourseButton.client'
import { SubmitForReviewButton } from '@/features/producer/courses/components/SubmitForReviewButton.client'

interface CourseCardProps {
  course: ProducerCourse
}

function getStatusBadge(status: string) {
  const variants = {
    draft: { label: 'Rascunho', variant: 'secondary' as const },
    pending_review: { label: 'Em Revisão', variant: 'default' as const },
    approved: { label: 'Aprovado', variant: 'default' as const },
    rejected: { label: 'Rejeitado', variant: 'destructive' as const },
    archived: { label: 'Arquivado', variant: 'destructive' as const },
  }
  return variants[status as keyof typeof variants] || variants.draft
}

export function CourseCard({ course }: CourseCardProps) {
  const statusBadge = getStatusBadge(course.status)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
        {course.thumbnail_url ? (
          <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-400">
            <Eye size={48} />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">
          {course.title}
        </h3>

        {course.description && (
          <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {course.description}
          </p>
        )}

        {course.review_feedback && (
          <div
            role="note"
            className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-semibold">
              {course.status === 'rejected' ? 'Motivo da rejeição' : 'Alterações solicitadas'}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{course.review_feedback}</p>
          </div>
        )}

        {/* Metrics */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {course.total_students}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-slate-600 dark:text-slate-400" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
              }).format(course.total_revenue)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star size={16} className="fill-yellow-500 text-yellow-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {course.average_rating > 0 ? course.average_rating.toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/courses/${course.slug}`} target="_blank">
                <Eye size={16} className="mr-2" />
                Ver Página
              </Link>
            </Button>
            <Button asChild variant="default" size="sm" className="flex-1">
              <Link href={`/producer/courses/${course.id}/edit`}>
                <Edit size={16} className="mr-2" />
                Editar
              </Link>
            </Button>
            <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
          </div>

          <SubmitForReviewButton
            courseId={course.id}
            courseTitle={course.title}
            status={course.status}
          />
        </div>
      </div>
    </div>
  )
}
