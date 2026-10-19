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
import { rejectSchema, type RejectFormData } from '../lib/validations'
import { rejectCourseAction } from '../actions/reject-course'
import { XCircle, Loader2 } from 'lucide-react'

interface RejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

export function RejectDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess,
}: RejectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
    },
  })

  async function onSubmit(data: RejectFormData) {
    setIsSubmitting(true)

    try {
      const result = await rejectCourseAction(courseId, data.reason)

      if (result.success) {
        toast({
          title: 'Curso rejeitado',
          description: 'O curso foi rejeitado e o produtor foi notificado.',
          variant: 'destructive',
        })
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao rejeitar curso',
          description: result.error || 'Ocorreu um erro ao rejeitar o curso.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao rejeitar curso',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Rejeitar Curso
          </DialogTitle>
          <DialogDescription>
            Você está prestes a rejeitar o curso <strong>{courseTitle}</strong>. O curso não será
            publicado e o produtor será notificado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da rejeição <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explique detalhadamente o motivo da rejeição..."
              rows={6}
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-red-500">{form.formState.errors.reason.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Seja claro e específico para ajudar o produtor a entender o problema.
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
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeitar Curso
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
