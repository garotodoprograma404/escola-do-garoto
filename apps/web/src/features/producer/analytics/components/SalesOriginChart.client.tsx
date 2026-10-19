// =====================================================
// PRODUCER ANALYTICS - SALES ORIGIN CHART (Client Component)
// =====================================================

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import type { SalesOrigin } from '../types'
import { formatCurrency } from '@/shared/lib/utils'
import { PieChart } from 'lucide-react'

interface SalesOriginChartProps {
  data: SalesOrigin[]
}

export function SalesOriginChart({ data }: SalesOriginChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Origem das Vendas</CardTitle>
          <CardDescription>Vendas do período: por afiliados e diretas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">Sem dados para exibir</div>
        </CardContent>
      </Card>
    )
  }

  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-600" />
          Origem das Vendas
        </CardTitle>
        <CardDescription>Vendas do período: por afiliados e diretas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = (item.count / total) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${colors[index % colors.length]}`} />
                    <span className="font-medium">{item.source}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.count} vendas</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full ${colors[index % colors.length]} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
