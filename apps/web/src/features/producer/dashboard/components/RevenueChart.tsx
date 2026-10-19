'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RevenueChartData } from '../types'

interface RevenueChartProps {
  data: RevenueChartData[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatCurrency = (value: number | string | undefined) => {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0)

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(numericValue)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-xl">Receita dos Últimos 30 Dias</CardTitle>
          <CardDescription>Acompanhe suas vendas diárias</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground sm:min-h-[220px] sm:text-base">
            Nenhuma venda nos últimos 30 dias
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="text-xl">Receita dos Últimos 30 Dias</CardTitle>
        <CardDescription>Acompanhe suas vendas diárias</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 pt-0 sm:px-4 sm:pb-6">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              className="text-xs"
              stroke="currentColor"
            />
            <YAxis
              tickFormatter={formatCurrency}
              className="text-xs"
              stroke="currentColor"
              width={58}
            />
            <Tooltip
              formatter={(value) => {
                if (typeof value === 'number' || typeof value === 'string') {
                  return formatCurrency(value)
                }
                if (Array.isArray(value)) {
                  return formatCurrency(value[0])
                }
                return formatCurrency(0)
              }}
              labelFormatter={(label) => formatDate(String(label ?? ''))}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
