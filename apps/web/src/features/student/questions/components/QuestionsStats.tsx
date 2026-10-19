// =====================================================
// STUDENT QUESTIONS - STATS
// =====================================================

import { Card, CardContent } from '@/shared/components/ui/card'
import { CheckCircle2, Globe2, MessageCircle, Clock3 } from 'lucide-react'
import type { StudentQuestionStats } from '../types'

interface QuestionsStatsProps {
  stats: StudentQuestionStats
}

export function QuestionsStats({ stats }: QuestionsStatsProps) {
  const cards = [
    {
      title: 'Total de Perguntas',
      value: stats.total,
      icon: MessageCircle,
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
    {
      title: 'Respondidas',
      value: stats.answered,
      icon: CheckCircle2,
      iconClass: 'text-green-600',
      bgClass: 'bg-green-50',
    },
    {
      title: 'Pendentes',
      value: stats.pending,
      icon: Clock3,
      iconClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
    },
    {
      title: 'Públicas',
      value: stats.public,
      icon: Globe2,
      iconClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-tight text-muted-foreground sm:text-sm">
                    {card.title}
                  </p>
                  <div className={`${card.bgClass} rounded-full p-2.5 sm:p-3`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.iconClass}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold leading-none sm:mt-2">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
