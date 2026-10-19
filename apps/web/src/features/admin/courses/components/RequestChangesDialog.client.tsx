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
import { Checkbox } from '@/shared/components/ui/checkbox'
import { useToast } from '@/shared/hooks/use-toast'
import { requestChangesSchema, type RequestChangesFormData } from '../lib/validations'
import { requestChangesAction } from '../actions/request-changes'
import { AlertCircle, Loader2 } from 'lucide-react'

interface RequestChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onSuccess?: () => void
}

const CHANGE_OPTIONS = [
  { id: 'video_quality', label: 'Melhorar qualidade de vídeo' },
  { id: 'audio_quality', label: 'Melhorar qualidade de áudio' },
  { id: 'content', label: 'Ajustar conteúdo programático' },
  { id: 'resources', label: 'Adicionar recursos/materiais' },
  { id: 'copyright', label: 'Revisar questões de copyright' },
  { id: 'pricing', label: 'Ajustar precificação' },
  { id: 'description', label: 'Melhorar descrição do curso' },
  { id: 'thumbnail', label: 'Melhorar thumbnail/capa' },
  { id: 'other', label: 'Outros (especificar no feedback)' },
]

export function RequestChangesDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess,
}: RequestChangesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedChanges, setSelectedChanges] = useState<string[]>([])
  const { toast } = useToast()

  const form = useForm<RequestChangesFormData>({
    resolver: zodResolver(requestChangesSchema),
    defaultValues: {
      feedback: '',
      changes: [],
    },
  })

  function handleChangeToggle(changeId: string) {
    const newChanges = selectedChanges.includes(changeId)
      ? selectedChanges.filter((id) => id !== changeId)
      : [...selectedChanges, changeId]

    setSelectedChanges(newChanges)
    form.setValue('changes', newChanges)
  }

  async function onSubmit(data: RequestChangesFormData) {
    // Validação extra para garantir
    if (!data.changes || data.changes.length === 0) {
      toast({
        title: 'Selecione mudanças',
        description: 'Selecione pelo menos uma mudança necessária.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await requestChangesAction(courseId, data.feedback, data.changes)

      if (result.success) {
        toast({
          title: 'Mudanças solicitadas',
          description: 'O produtor foi notificado sobre as mudanças necessárias.',
        })
        onOpenChange(false)
        form.reset()
        setSelectedChanges([])
        onSuccess?.()
      } else {
        toast({
          title: 'Erro ao solicitar mudanças',
          description: result.error || 'Ocorreu um erro ao solicitar mudanças.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao solicitar mudanças',
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
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Solicitar Mudanças
          </DialogTitle>
          <DialogDescription>
            Solicite mudanças no curso <strong>{courseTitle}</strong>. O curso voltará para rascunho
            e o produtor será notificado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label>
              Mudanças necessárias <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3 rounded-lg border p-4">
              {CHANGE_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={selectedChanges.includes(option.id)}
                    onCheckedChange={() => handleChangeToggle(option.id)}
                  />
                  <label
                    htmlFor={option.id}
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedChanges.length === 0 && (
              <p className="text-sm text-red-500">Selecione pelo menos uma mudança necessária</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">
              Feedback detalhado <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="feedback"
              placeholder="Explique detalhadamente as mudanças necessárias..."
              rows={6}
              {...form.register('feedback')}
            />
            {form.formState.errors.feedback && (
              <p className="text-sm text-red-500">{form.formState.errors.feedback.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Seja específico para ajudar o produtor a fazer as correções necessárias.
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
                  Enviando...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Solicitar Mudanças
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
