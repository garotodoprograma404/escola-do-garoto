// =====================================================
// COURSE REVIEWS - CLIENT COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { Star, MessageSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Progress } from '@/shared/components/ui/progress'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import type { CourseReview, ReviewStats } from '../types'

interface CourseReviewsProps {
  reviews: CourseReview[]
  stats: ReviewStats
}

export function CourseReviews({ reviews, stats }: CourseReviewsProps) {
  const [showAll, setShowAll] = useState(false)
  const displayedReviews = showAll ? reviews : reviews.slice(0, 5)

  if (stats.total_reviews === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Avaliações</h2>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-600 dark:text-slate-400">
              Este curso ainda não possui avaliações
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Avaliações dos Alunos</h2>
        {reviews.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="font-bold text-primary hover:text-primary/80"
          >
            {showAll ? 'Ver menos' : `Ver todas (${reviews.length})`}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div
        className="group grid cursor-pointer gap-6 md:grid-cols-2"
        onClick={() => setShowAll(true)}
      >
        {/* Average Rating */}
        <Card className="border-slate-200 transition-colors group-hover:border-primary dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mb-2 text-5xl font-bold text-slate-900 dark:text-white">
                {stats.average_rating}
              </div>
              <div className="mb-2 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(stats.average_rating)
                        ? 'fill-primary text-primary'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Classificação do curso
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {stats.total_reviews} {stats.total_reviews === 1 ? 'avaliação' : 'avaliações'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card className="border-slate-200 transition-colors group-hover:border-primary dark:border-slate-800">
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.rating_distribution.map((dist) => (
                <div key={dist.rating} className="flex items-center gap-3">
                  <div className="flex w-12 items-center gap-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {dist.rating}
                    </span>
                    <Star className="h-3 w-3 fill-primary text-primary" />
                  </div>
                  <Progress value={dist.percentage} className="h-2 flex-1" />
                  <span className="w-12 text-right text-sm text-slate-600 dark:text-slate-400">
                    {dist.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review) => (
          <Card
            key={review.id}
            className="border-slate-200 transition-shadow hover:shadow-md dark:border-slate-800"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-slate-100 dark:border-slate-800">
                  <AvatarImage src={review.user.avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                    {review.user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {review.user.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating
                                ? 'fill-primary text-primary'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(review.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.title && (
                    <p className="font-semibold text-slate-900 dark:text-white">{review.title}</p>
                  )}
                  {review.review && (
                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                      {review.review}
                    </p>
                  )}
                  {review.response && (
                    <div className="mt-4 rounded-lg border-l-4 border-primary bg-slate-50 p-4 dark:bg-slate-800/50">
                      <p className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                        Resposta do Instrutor
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {review.response}
                      </p>
                      {review.responded_at && (
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                          {new Date(review.responded_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {reviews.length > 5 && !showAll && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAll(true)} className="border-2">
            Carregar mais avaliações ({reviews.length - 5} restantes)
          </Button>
        </div>
      )}
    </section>
  )
}
