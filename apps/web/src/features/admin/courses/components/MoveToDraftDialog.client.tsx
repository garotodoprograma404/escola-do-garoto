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
import { moveCourseToDraftSchema, type MoveCourseToDraftFormData } from '../lib/validations'
import { moveCourseToDraftAction } from '../actions/move-course-to-draft'
import { Loader2, RotateCcw } from 'lucide-react'

interface MoveToDraftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

export function MoveToDraftDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess,
}: MoveToDraftDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<MoveCourseToDraftFormData>({
    resolver: zodResolver(moveCourseToDraftSchema),
    defaultValues: {
      reason: '',
    },
  })

  async function onSubmit(values: MoveCourseToDraftFormData) {
    setIsSubmitting(true)

    try {
      const result = await moveCourseToDraftAction(courseId, values)
      if (result.success) {
        toast({
          title: 'Curso em rascunho',
          description: 'O curso foi movido para rascunho com sucesso.',
        })
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao mover para rascunho',
          description: result.error || 'Não foi possível atualizar o curso.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao mover para rascunho',
        description: 'Não foi possível atualizar o curso.',
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
            <RotateCcw className="h-5 w-5 text-amber-600" />
            Mover Curso para Rascunho
          </DialogTitle>
          <DialogDescription>
            O curso <strong>{courseTitle}</strong> voltará para rascunho e sairá do catálogo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Informe o motivo para retornar o curso para rascunho..."
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
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Movendo...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Mover para Rascunho
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
