// =====================================================
// PRODUCER ANALYTICS - STUDENT GROWTH CHART (Client Component)
// =====================================================

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import type { StudentGrowth } from '../types'
import { formatDayLabel } from '../lib/format'
import { TrendingUp } from 'lucide-react'

interface StudentGrowthChartProps {
  data: StudentGrowth[]
}

export function StudentGrowthChart({ data }: StudentGrowthChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crescimento de Alunos</CardTitle>
          <CardDescription>Novas matrículas por dia, no período escolhido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">Sem dados para exibir</div>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Crescimento de Alunos
        </CardTitle>
        <CardDescription>Novas matrículas por dia, no período escolhido</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => {
            const percentage = (item.count / maxCount) * 100
            const formattedDate = formatDayLabel(item.date)

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-16 text-xs text-muted-foreground">{formattedDate}</div>
                <div className="h-8 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div
                    className="flex h-full items-center justify-end bg-gradient-to-r from-blue-500 to-blue-600 px-2 transition-all duration-300"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    <span className="text-xs font-medium text-white">{item.count}</span>
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
