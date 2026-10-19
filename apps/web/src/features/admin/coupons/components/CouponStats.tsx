'use client'

import { Tag, TrendingUp, DollarSign, Percent } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import type { CouponStats as CouponStatsType } from '../types'

interface CouponStatsProps {
  stats: CouponStatsType
}

export function CouponStats({ stats }: CouponStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Cupons"
        value={stats.totalCoupons.toString()}
        icon={Tag}
        change={`${stats.activeCoupons} ativos`}
      />

      <StatCard
        title="Total de Usos"
        value={stats.totalUsage.toLocaleString('pt-BR')}
        icon={TrendingUp}
        change="Todos os cupons"
        positive={true}
      />

      <StatCard
        title="Desconto Total"
        value={formatCurrency(stats.totalDiscountGiven)}
        icon={DollarSign}
        change={`${formatCurrency(stats.averageDiscountPerUse)} por uso`}
      />

      <StatCard
        title="Pedidos com Cupom"
        value={`${stats.conversionRate.toFixed(1)}%`}
        icon={Percent}
        change="Sobre o total de pedidos"
        positive={stats.conversionRate > 0}
      />
    </div>
  )
}
