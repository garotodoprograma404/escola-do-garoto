// =====================================================
// NOTE FORM DIALOG - CLIENT COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { createNote, updateNote } from '../actions/notes-actions'
import { useToast } from '@/shared/hooks/use-toast'
import type { LessonNote } from '../types'

const noteSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  video_timestamp: z.number().optional(),
})

type NoteFormValues = z.infer<typeof noteSchema>

interface NoteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: LessonNote
  lessonId?: string
  courseId?: string
  videoTimestamp?: number
}

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  lessonId,
  courseId,
  videoTimestamp,
}: NoteFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: note?.title || '',
      content: note?.content || '',
      video_timestamp: note?.video_timestamp || videoTimestamp || undefined,
    },
  })

  const onSubmit = async (data: NoteFormValues) => {
    setIsSubmitting(true)
    try {
      let result

      if (note) {
        // Editar nota existente
        result = await updateNote(note.id, data)
      } else if (lessonId && courseId) {
        // Criar nova nota
        result = await createNote(lessonId, courseId, data)
      } else {
        throw new Error('Dados insuficientes')
      }

      if (result.success) {
        toast({
          title: note ? 'Nota atualizada' : 'Nota criada',
          description: note ? 'A nota foi atualizada com sucesso' : 'A nota foi criada com sucesso',
        })
        onOpenChange(false)
        form.reset()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao salvar nota',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar nota',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{note ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
          <DialogDescription>
            {note ? 'Edite sua nota de estudo' : 'Crie uma nota para registrar seus aprendizados'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conceito importante sobre..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Escreva sua nota aqui..." rows={8} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {videoTimestamp !== undefined && !note && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  Timestamp do vídeo:{' '}
                  <span className="font-medium text-foreground">
                    {Math.floor(videoTimestamp / 60)}:
                    {(videoTimestamp % 60).toString().padStart(2, '0')}
                  </span>
                </p>
              </div>
            )}

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
                {isSubmitting ? 'Salvando...' : note ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
