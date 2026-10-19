import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { TrendingUp, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import type { LiquidityData } from '../types'

interface ProjectionPanelProps {
  data: LiquidityData
}

export function ProjectionPanel({ data }: ProjectionPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  // Calcular projeções
  const projectedBalance = data.currentBalance + data.projectedIncome - data.pendingPayments
  const liquidityRatio = data.currentBalance / (data.pendingPayments || 1)
  const isHealthy = liquidityRatio >= 1.5

  // Calcular média diária de entrada (últimos 7 dias)
  const last7Days = data.cashFlow.slice(-7)
  const avgDailyIncome = last7Days.reduce((sum, day) => sum + day.income, 0) / 7
  const projectedMonthlyIncome = avgDailyIncome * 30

  return (
    <div className="space-y-4">
      {/* Projeção de Saldo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Projeção Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Saldo Projetado (30 dias)</p>
              <p className="text-2xl font-bold">{formatCurrency(projectedBalance)}</p>
              <p className="text-xs text-muted-foreground">
                Baseado em receita projetada e pagamentos pendentes
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Receita Média Diária</p>
              <p className="text-2xl font-bold">{formatCurrency(avgDailyIncome)}</p>
              <p className="text-xs text-muted-foreground">
                Projeção mensal: {formatCurrency(projectedMonthlyIncome)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Índice de Liquidez */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Índice de Liquidez
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Índice Atual</p>
              <p className="text-3xl font-bold">{liquidityRatio.toFixed(2)}x</p>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isHealthy ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}
            >
              {isHealthy ? 'Saudável' : 'Atenção'}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo Disponível</span>
              <span className="font-medium">{formatCurrency(data.currentBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Obrigações Pendentes</span>
              <span className="font-medium">{formatCurrency(data.pendingPayments)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isHealthy
              ? 'Liquidez saudável. Capacidade de honrar compromissos.'
              : 'Atenção: Liquidez abaixo do ideal. Monitore os pagamentos.'}
          </p>
        </CardContent>
      </Card>

      {/* Próximos Eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Próximos Eventos Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-orange-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Pagamento de Saques</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(data.pendingPayments)} em {formatDate(data.nextPaymentDate)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
            <TrendingUp className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">Receita Esperada</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(data.projectedIncome)} nos próximos 30 dias
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
