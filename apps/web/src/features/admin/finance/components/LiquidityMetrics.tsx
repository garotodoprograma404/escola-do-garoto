import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import type { LiquidityData } from '../types'

interface LiquidityMetricsProps {
  data: LiquidityData
}

export function LiquidityMetrics({ data }: LiquidityMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const metrics = [
    {
      title: 'Saldo Atual',
      value: data.currentBalance,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Receita Projetada',
      value: data.projectedIncome,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Pagamentos Pendentes',
      value: data.pendingPayments,
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Disponível para Saque',
      value: data.availableForWithdrawal,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <div className={`rounded-full p-2 ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metric.value)}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Alertas de Liquidez */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status de Liquidez</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Valor Reservado</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(data.reservedAmount)} mantidos como reserva de segurança
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium">Próximo Pagamento</p>
              <p className="text-sm text-muted-foreground">
                Previsto para {formatDate(data.nextPaymentDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
