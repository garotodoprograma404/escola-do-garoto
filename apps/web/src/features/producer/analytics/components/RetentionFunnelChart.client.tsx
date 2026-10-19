// =====================================================
// PRODUCER ANALYTICS - RETENTION FUNNEL CHART (Client Component)
// =====================================================

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import type { RetentionFunnel } from '../types'
import { Filter } from 'lucide-react'

interface RetentionFunnelChartProps {
  data: RetentionFunnel[]
}

export function RetentionFunnelChart({ data }: RetentionFunnelChartProps) {
  if (data.length === 0 || data[0].count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Retenção</CardTitle>
          <CardDescription>Jornada dos alunos nos cursos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">Sem dados para exibir</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-purple-600" />
          Funil de Retenção
        </CardTitle>
        <CardDescription>Jornada dos alunos nos cursos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((stage, index) => {
            const widthPercentage = stage.percentage
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500']

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="text-muted-foreground">
                    {stage.count} ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full ${colors[index % colors.length]} flex items-center justify-center font-medium text-white transition-all duration-500`}
                    style={{ width: `${Math.max(widthPercentage, 10)}%` }}
                  >
                    {stage.percentage >= 15 && `${stage.percentage.toFixed(0)}%`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
