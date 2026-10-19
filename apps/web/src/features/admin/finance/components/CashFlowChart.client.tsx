'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { LiquidityData } from '../types'

interface CashFlowChartProps {
  data: LiquidityData
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (value: number | string | undefined) => {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0)

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericValue)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  // Preparar dados para o gráfico
  const chartData = data.cashFlow.map((item) => ({
    date: formatDate(item.date),
    entrada: item.income,
    saida: item.outcome,
    saldo: item.balance,
  }))

  return (
    <div className="space-y-4">
      {/* Gráfico de Fluxo de Caixa (Entrada/Saída) */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(
                    typeof value === 'number' || typeof value === 'string' ? value : undefined,
                  )
                }
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="entrada" fill="#10b981" name="Entrada" />
              <Bar dataKey="saida" fill="#ef4444" name="Saída" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Saldo Acumulado */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value) =>
                  formatCurrency(
                    typeof value === 'number' || typeof value === 'string' ? value : undefined,
                  )
                }
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Saldo"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
