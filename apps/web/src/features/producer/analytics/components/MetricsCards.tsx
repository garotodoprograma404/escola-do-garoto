// =====================================================
// PRODUCER ANALYTICS - METRICS CARDS (Server Component)
// =====================================================

import { Users, UserPlus, DollarSign, Star, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { AnalyticsMetrics } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface MetricsCardsProps {
  metrics: AnalyticsMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total de alunos',
      value: metrics.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      format: 'number',
    },
    {
      title: 'Novos alunos no período',
      value: metrics.newStudents,
      icon: UserPlus,
      color: 'text-green-600',
      format: 'number',
    },
    {
      title: 'Receita no período',
      value: metrics.totalRevenue,
      icon: DollarSign,
      color: 'text-emerald-600',
      format: 'currency',
    },
    {
      title: 'Avaliação média',
      value: metrics.averageRating,
      icon: Star,
      color: 'text-yellow-600',
      format: 'rating',
    },
    {
      title: 'Taxa de conclusão',
      value: metrics.completionRate,
      icon: TrendingUp,
      color: 'text-purple-600',
      format: 'percentage',
    },
    {
      title: 'Alunos ativos (30 dias)',
      value: metrics.activeStudents,
      icon: Activity,
      color: 'text-orange-600',
      format: 'number',
    },
  ]

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'rating':
        return `${value.toFixed(1)} ⭐`
      default:
        return value.toLocaleString('pt-BR')
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(card.value, card.format)}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
