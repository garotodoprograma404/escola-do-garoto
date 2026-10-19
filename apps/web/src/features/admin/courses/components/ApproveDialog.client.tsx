'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/hooks/use-toast'
import { approveSchema, type ApproveFormData } from '../lib/validations'
import { approveCourseAction } from '../actions/approve-course'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface ApproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

export function ApproveDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess,
}: ApproveDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      feedback: '',
    },
  })

  async function onSubmit(data: ApproveFormData) {
    setIsSubmitting(true)

    try {
      const result = await approveCourseAction(courseId, data.feedback)

      if (result.success) {
        toast({
          title: 'Curso aprovado!',
          description: 'O curso foi aprovado e publicado com sucesso.',
        })
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao aprovar curso',
          description: result.error || 'Ocorreu um erro ao aprovar o curso.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao aprovar curso',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Aprovar Curso
          </DialogTitle>
          <DialogDescription>
            Você está prestes a aprovar o curso <strong>{courseTitle}</strong>. O curso será
            publicado e ficará disponível para compra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (opcional)</Label>
            <Textarea
              id="feedback"
              placeholder="Adicione um feedback positivo para o produtor..."
              rows={4}
              {...form.register('feedback')}
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              Este feedback será enviado ao produtor junto com a notificação de aprovação.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprovar Curso
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
