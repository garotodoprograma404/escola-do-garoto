'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { useToast } from '@/shared/hooks/use-toast'
import type { CourseStatus } from '../types'
import { submitCourseForReviewAction } from '../actions/submit-for-review'

interface SubmitForReviewButtonProps {
  courseId: string
  courseTitle: string
  status: CourseStatus
}

function getButtonLabel(status: CourseStatus): string {
  if (status === 'rejected') return 'Reenviar Revisão'
  if (status === 'pending_review') return 'Em Revisão'
  if (status === 'approved') return 'Aprovado'
  return 'Enviar Revisão'
}

export function SubmitForReviewButton({
  courseId,
  courseTitle,
  status,
}: SubmitForReviewButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  if (status === 'archived') {
    return null
  }

  if (status === 'pending_review' || status === 'approved') {
    return (
      <Button type="button" variant="secondary" size="sm" className="w-full" disabled>
        {getButtonLabel(status)}
      </Button>
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const result = await submitCourseForReviewAction(courseId)

    if (!result.success) {
      toast({
        title: 'Erro ao enviar para revisão',
        description: result.error || 'Não foi possível enviar este curso para revisão.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Curso enviado',
        description: result.message || 'Curso enviado para revisão com sucesso.',
      })
      setIsOpen(false)
    }

    setIsSubmitting(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" className="w-full">
          <Send size={16} className="mr-2" />
          {getButtonLabel(status)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enviar Curso para Revisão</AlertDialogTitle>
          <AlertDialogDescription>
            O curso <strong>{courseTitle}</strong> será enviado para avaliação da equipe
            administrativa. Após enviar, ele ficará com status de revisão.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              handleSubmit()
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar Envio'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
