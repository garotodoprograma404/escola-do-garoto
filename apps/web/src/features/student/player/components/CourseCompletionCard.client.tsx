// =====================================================
// COURSE COMPLETION CARD - CLIENT COMPONENT
// =====================================================

'use client'

import { useEffect, useState } from 'react'
import { Award, Star } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { cn } from '@/shared/lib/utils'
import { getMyReviewAction, saveReviewAction } from '../actions/review-actions'
import type { CourseReviewByStudent } from '../types'

interface CourseCompletionCardProps {
  courseId: number
  courseTitle: string
}

const RATINGS = [1, 2, 3, 4, 5] as const

function ratingLabel(rating: number) {
  return rating === 1 ? '1 estrela' : `${rating} estrelas`
}

/** Aparece quando todas as aulas estão concluídas: parabeniza e leva à avaliação do curso. */
export function CourseCompletionCard({ courseId, courseTitle }: CourseCompletionCardProps) {
  const { toast } = useToast()
  const [myReview, setMyReview] = useState<CourseReviewByStudent | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [review, setReview] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getMyReviewAction(courseId).then((existing) => {
      if (!cancelled) setMyReview(existing)
    })
    return () => {
      cancelled = true
    }
  }, [courseId])

  const openDialog = () => {
    setRating(myReview?.rating ?? 0)
    setTitle(myReview?.title ?? '')
    setReview(myReview?.review ?? '')
    setIsOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (rating === 0) {
      toast({
        title: 'Escolha uma nota',
        description: 'Toque nas estrelas.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    const result = await saveReviewAction({ courseId, rating, title, review })
    setIsSaving(false)

    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }

    setMyReview({
      id: myReview?.id ?? '',
      rating,
      title: title.trim() || null,
      review: review.trim() || null,
      response: myReview?.response ?? null,
    })
    setIsOpen(false)
    toast({ title: 'Avaliação enviada', description: 'Obrigado por compartilhar sua opinião.' })
  }

  const hasReview = myReview !== null
  const isLocked = Boolean(myReview?.response)

  return (
    <Card className="border-green-600/40 bg-green-50 p-4 dark:bg-green-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Award className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
          <div>
            <h3 className="font-semibold">Você concluiu o curso!</h3>
            <p className="text-sm text-muted-foreground">
              {hasReview
                ? `Sua avaliação: ${ratingLabel(myReview.rating)}.`
                : 'Conte para outros alunos o que achou do curso.'}
            </p>
          </div>
        </div>
        {isLocked ? null : (
          <Button onClick={openDialog}>
            <Star className="mr-2 h-4 w-4" />
            {hasReview ? 'Editar minha avaliação' : 'Avaliar curso'}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Avaliar curso</DialogTitle>
              <DialogDescription>{courseTitle}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p className="text-sm font-medium" id="review-rating-label">
                Sua nota
              </p>
              <div
                role="radiogroup"
                aria-labelledby="review-rating-label"
                className="flex items-center gap-1"
              >
                {RATINGS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={ratingLabel(value)}
                    onClick={() => setRating(value)}
                    className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        'h-7 w-7',
                        value <= rating
                          ? 'fill-primary text-primary'
                          : 'text-slate-300 dark:text-slate-600',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-title">Título (opcional)</Label>
              <Input
                id="review-title"
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Resuma em uma frase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-text">Comentário (opcional)</Label>
              <Textarea
                id="review-text"
                value={review}
                maxLength={2000}
                rows={4}
                onChange={(event) => setReview(event.target.value)}
                placeholder="Conte como foi sua experiência com o curso..."
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enviando...' : 'Enviar avaliação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
