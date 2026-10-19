// =====================================================
// PRODUCER FINANCIALS - BALANCE CARDS (Server Component)
// =====================================================

import { DollarSign, Clock, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { FinancialBalance } from '../types'

interface BalanceCardsProps {
  balance: FinancialBalance
}

export function BalanceCards({ balance }: BalanceCardsProps) {
  const cards = [
    {
      title: 'Saldo Disponível',
      value: balance.available,
      icon: Wallet,
      description: 'Pronto para saque',
      color: 'text-green-600',
    },
    {
      title: 'Saldo Pendente',
      value: balance.pending,
      icon: Clock,
      description: 'Aguardando compensação',
      color: 'text-yellow-600',
    },
    {
      title: 'Saldo Total',
      value: balance.total,
      icon: DollarSign,
      description: 'Disponível + Pendente',
      color: 'text-blue-600',
    },
    {
      title: 'Total Histórico',
      value: balance.lifetime,
      icon: TrendingUp,
      description: 'Receita total acumulada',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(card.value)}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
