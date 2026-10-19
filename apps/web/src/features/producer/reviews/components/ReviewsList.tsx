// =====================================================
// PRODUCER REVIEWS - REVIEWS LIST (Server Component)
// =====================================================

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Star, ThumbsUp, CheckCircle2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import type { Review } from '../types'
import { ReplyButton } from './ReplyButton.client'

interface ReviewsListProps {
  reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Star className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Nenhuma avaliação encontrada</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const hasResponse = !!review.response
        const createdDate = format(new Date(review.createdAt), "dd 'de' MMMM 'de' yyyy", {
          locale: ptBR,
        })

        return (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.studentAvatar} />
                      <AvatarFallback>{review.studentName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{review.studentName}</p>
                        {review.isVerifiedPurchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Compra Verificada
                          </Badge>
                        )}
                        {review.isFeatured && (
                          <Badge variant="default" className="text-xs">
                            Destaque
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">• {createdDate}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{review.courseTitle}</p>
                    </div>
                  </div>
                  {!hasResponse && (
                    <ReplyButton
                      reviewId={review.id}
                      studentName={review.studentName}
                      reviewText={review.review}
                    />
                  )}
                </div>

                {/* Review Title */}
                {review.title && (
                  <div className="pl-13">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{review.title}</h4>
                  </div>
                )}

                {/* Review Text */}
                {review.review && (
                  <div className="pl-13">
                    <p className="text-slate-700 dark:text-slate-300">{review.review}</p>
                  </div>
                )}

                {/* Producer Response */}
                {hasResponse && review.response && (
                  <div className="pl-13 border-t pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        Resposta do Produtor
                      </span>
                      {review.respondedAt && (
                        <span className="text-xs text-muted-foreground">
                          •{' '}
                          {format(new Date(review.respondedAt), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="rounded-lg bg-blue-50 p-3 text-sm text-slate-600 dark:bg-blue-950/20 dark:text-slate-400">
                      {review.response}
                    </p>
                  </div>
                )}

                {/* Footer */}
                {review.helpfulCount > 0 && (
                  <div className="pl-13 flex items-center gap-2 text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{review.helpfulCount} pessoas acharam útil</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
