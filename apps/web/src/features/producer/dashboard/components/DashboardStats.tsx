import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DollarSign, Users, BookOpen, Star, TrendingUp, Clock } from 'lucide-react'
import type { DashboardStats as Stats } from '../types'

interface DashboardStatsProps {
  stats: Stats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const cards = [
    {
      title: 'Receita Total',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: 'Receita acumulada',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Receita do Mês',
      value: formatCurrency(stats.monthRevenue),
      icon: TrendingUp,
      description: 'Receita de ' + new Date().toLocaleDateString('pt-BR', { month: 'long' }),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total de Alunos',
      value: stats.totalStudents.toString(),
      icon: Users,
      description: 'Alunos matriculados',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Cursos Publicados',
      value: stats.totalCourses.toString(),
      icon: BookOpen,
      description: 'Cursos ativos',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Avaliação Média',
      value: stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A',
      icon: Star,
      description: 'Média de avaliações',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ]

  if (stats.pendingWithdrawals > 0) {
    cards.push({
      title: 'Saques Pendentes',
      value: formatCurrency(stats.pendingWithdrawals),
      icon: Clock,
      description: 'Aguardando processamento',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-sm font-medium leading-tight">{card.title}</CardTitle>
              <div className={`rounded-full p-2 sm:p-2.5 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
              <div className="break-words text-2xl font-bold leading-tight sm:text-[1.75rem]">
                {card.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
