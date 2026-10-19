// =====================================================
// PRODUCER ANALYTICS - COMPLETION CHART (Client Component)
// =====================================================

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import type { CompletionStats } from '../types'
import { CheckCircle2 } from 'lucide-react'

interface CompletionChartProps {
  data: CompletionStats
}

export function CompletionChart({ data }: CompletionChartProps) {
  const total = data.completed + data.inProgress + data.notStarted

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conclusão</CardTitle>
          <CardDescription>Status dos alunos nos cursos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">Sem dados para exibir</div>
        </CardContent>
      </Card>
    )
  }

  const completedPercentage = (data.completed / total) * 100
  const inProgressPercentage = (data.inProgress / total) * 100
  const notStartedPercentage = (data.notStarted / total) * 100

  const stats = [
    {
      label: 'Concluídos',
      count: data.completed,
      percentage: completedPercentage,
      color: 'bg-green-500',
    },
    {
      label: 'Em Progresso',
      count: data.inProgress,
      percentage: inProgressPercentage,
      color: 'bg-blue-500',
    },
    {
      label: 'Não Iniciados',
      count: data.notStarted,
      percentage: notStartedPercentage,
      color: 'bg-slate-300 dark:bg-slate-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Taxa de Conclusão
        </CardTitle>
        <CardDescription>Status dos alunos nos cursos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${completedPercentage}%` }}
          />
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${inProgressPercentage}%` }}
          />
          <div
            className="bg-slate-300 transition-all duration-300 dark:bg-slate-600"
            style={{ width: `${notStartedPercentage}%` }}
          />
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stat.count}</span>
                <span className="text-xs text-muted-foreground">
                  ({stat.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
