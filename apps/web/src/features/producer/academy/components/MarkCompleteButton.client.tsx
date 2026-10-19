// =====================================================
// PRODUCER ACADEMY - MARK COMPLETE BUTTON (CLIENT)
// =====================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { markCompleteAction } from '../actions/mark-complete'
import { useToast } from '@/shared/hooks/use-toast'

interface MarkCompleteButtonProps {
  contentId: string
}

export function MarkCompleteButton({ contentId }: MarkCompleteButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleMarkComplete = async () => {
    setIsSubmitting(true)

    const result = await markCompleteAction(contentId)

    if (result.error) {
      toast({
        title: 'Erro',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Conteúdo marcado como concluído!',
      })
      router.refresh()
    }

    setIsSubmitting(false)
  }

  return (
    <Button size="lg" onClick={handleMarkComplete} disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Marcando...
        </>
      ) : (
        <>
          <CheckCircle className="mr-2 h-5 w-5" />
          Marcar como Concluído
        </>
      )}
    </Button>
  )
}
