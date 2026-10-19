'use client'

import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, Clock } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import type { FinancialMetrics } from '../types'

interface HealthMetricsPanelProps {
  metrics: FinancialMetrics
}

export function HealthMetricsPanel({ metrics }: HealthMetricsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const platformFee = metrics.totalCommissions
  const producerLiability = Math.max(0, metrics.availableBalance)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Métricas de Saúde Financeira
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Volume Total de Vendas"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
        />

        <StatCard
          title="Lucro Líquido (Taxas)"
          value={formatCurrency(platformFee)}
          icon={TrendingUp}
        />

        <StatCard
          title="Saldo Reservado a Produtores"
          value={formatCurrency(producerLiability)}
          icon={ArrowUpRight}
        />

        {/* Card destacado de Saques Pendentes */}
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-6 shadow-sm dark:border-orange-900/30 dark:bg-orange-900/10">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-orange-100 p-2 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <Clock size={20} />
            </div>
            <span className="rounded-full bg-orange-200 px-2 py-1 text-xs font-bold text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Aguardando
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-orange-700 dark:text-orange-400">
            Saques Pendentes
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(metrics.pendingWithdrawals)}
          </h3>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Comissões Totais</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(metrics.totalCommissions)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <DollarSign size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Transações</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {metrics.transactionCount.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CreditCard size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Receita Mensal</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(metrics.monthlyRevenue)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp size={24} className="text-green-700 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
