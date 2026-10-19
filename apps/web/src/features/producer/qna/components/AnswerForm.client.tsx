// =====================================================
// PRODUCER Q&A - ANSWER FORM (Client Component)
// =====================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/hooks/use-toast'
import { answerQuestionAction } from '../actions/answer-question'

const formSchema = z.object({
  answer: z.string().min(10, 'A resposta deve ter pelo menos 10 caracteres'),
})

type FormData = z.infer<typeof formSchema>

interface AnswerFormProps {
  questionId: string
  onSuccess: () => void
}

export function AnswerForm({ questionId, onSuccess }: AnswerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('questionId', questionId)
      formData.append('answer', data.answer)

      const result = await answerQuestionAction(formData)

      if (result.success) {
        toast({
          title: 'Resposta enviada!',
          description: 'O aluno será notificado sobre sua resposta.',
        })
        onSuccess()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao enviar resposta',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar resposta',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="answer">Sua Resposta</Label>
        <Textarea
          id="answer"
          rows={6}
          placeholder="Digite sua resposta aqui..."
          {...register('answer')}
        />
        {errors.answer && <p className="text-sm text-red-600">{errors.answer.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Resposta
        </Button>
      </div>
    </form>
  )
}
