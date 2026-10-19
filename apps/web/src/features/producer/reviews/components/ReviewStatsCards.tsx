// =====================================================
// PRODUCER REVIEWS - STATS CARDS (Server Component)
// =====================================================

import { Star, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import type { ReviewStats } from '../types'

interface ReviewStatsCardsProps {
  stats: ReviewStats
}

export function ReviewStatsCards({ stats }: ReviewStatsCardsProps) {
  const totalReviews = stats.totalReviews

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Average Rating Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Avaliação Média
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-5xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <div className="pb-1 text-2xl text-muted-foreground">/ 5.0</div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.round(stats.averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Baseado em {totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </CardContent>
      </Card>

      {/* Distribution Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Distribuição de Notas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating as keyof typeof stats.distribution]
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-1">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress value={percentage} className="flex-1" />
                <span className="w-12 text-right text-sm text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
