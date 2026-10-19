// =====================================================
// PRODUCER Q&A - STATS CARDS (Server Component)
// =====================================================

import { MessageCircle, MessageCircleQuestion, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { QuestionStats } from '../types'

interface StatsCardsProps {
  stats: QuestionStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total de Perguntas',
      value: stats.total,
      icon: MessageCircle,
      color: 'text-blue-600',
    },
    {
      title: 'Pendentes',
      value: stats.pending,
      icon: MessageCircleQuestion,
      color: 'text-orange-600',
    },
    {
      title: 'Respondidas',
      value: stats.answered,
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      title: 'Tempo Médio de Resposta',
      value: stats.avgResponseTime > 0 ? `${stats.avgResponseTime.toFixed(1)}h` : '-',
      icon: Clock,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
