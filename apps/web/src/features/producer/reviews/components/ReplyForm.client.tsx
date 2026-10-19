// =====================================================
// PRODUCER REVIEWS - REPLY FORM (Client Component)
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
import { replyToReviewAction } from '../actions/reply-to-review'

const formSchema = z.object({
  response: z.string().min(10, 'A resposta deve ter pelo menos 10 caracteres'),
})

type FormData = z.infer<typeof formSchema>

interface ReplyFormProps {
  reviewId: string
  onSuccess: () => void
}

export function ReplyForm({ reviewId, onSuccess }: ReplyFormProps) {
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
      formData.append('reviewId', reviewId)
      formData.append('response', data.response)

      const result = await replyToReviewAction(formData)

      if (result.success) {
        toast({
          title: 'Resposta enviada!',
          description: 'Sua resposta foi publicada e o aluno será notificado.',
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
        <Label htmlFor="response">Sua Resposta Pública</Label>
        <Textarea
          id="response"
          rows={6}
          placeholder="Digite sua resposta aqui... Esta resposta será pública e visível para todos os alunos."
          {...register('response')}
        />
        {errors.response && <p className="text-sm text-red-600">{errors.response.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publicar Resposta
        </Button>
      </div>
    </form>
  )
}
