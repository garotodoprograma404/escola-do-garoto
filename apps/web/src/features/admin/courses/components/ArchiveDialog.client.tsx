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
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { archiveCourseSchema, type ArchiveCourseFormData } from '../lib/validations'
import { archiveCourseAction } from '../actions/archive-course'
import { Archive, Loader2 } from 'lucide-react'

interface ArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

export function ArchiveDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess,
}: ArchiveDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ArchiveCourseFormData>({
    resolver: zodResolver(archiveCourseSchema),
    defaultValues: { reason: '' },
  })

  async function onSubmit(values: ArchiveCourseFormData) {
    setIsSubmitting(true)

    try {
      const result = await archiveCourseAction(courseId, values.reason)
      if (result.success) {
        toast({
          title: 'Curso arquivado',
          description: 'O curso saiu do catálogo e o produtor foi avisado.',
        })
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao arquivar curso',
          description: result.error || 'Não foi possível arquivar o curso.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao arquivar curso',
        description: 'Não foi possível arquivar o curso.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-slate-600" />
            Arquivar Curso
          </DialogTitle>
          <DialogDescription>
            O curso <strong>{courseTitle}</strong> sai do catálogo. Quem já está matriculado
            continua com acesso, e você pode devolvê-lo para rascunho depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="archive-reason">Motivo (opcional)</Label>
            <Textarea
              id="archive-reason"
              placeholder="Informe o motivo do arquivamento..."
              rows={4}
              {...form.register('reason')}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-red-500">{form.formState.errors.reason.message}</p>
            )}
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
                  Arquivando...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar Curso
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
