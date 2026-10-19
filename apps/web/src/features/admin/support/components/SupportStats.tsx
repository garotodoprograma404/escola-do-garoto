'use client'

import { MessageSquare, Clock, CheckCircle, TrendingUp } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import type { SupportStats as SupportStatsType } from '../types'

interface SupportStatsProps {
  stats: SupportStatsType
}

export function SupportStats({ stats }: SupportStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tickets Abertos"
        value={stats.openTickets.toString()}
        icon={MessageSquare}
        change={`${stats.totalTickets} total`}
      />

      <StatCard
        title="Em Andamento"
        value={stats.inProgressTickets.toString()}
        icon={Clock}
        change="Sendo atendidos"
      />

      <StatCard
        title="Resolvidos Hoje"
        value={stats.resolvedToday.toString()}
        icon={CheckCircle}
        change="Últimas 24h"
        positive={true}
      />

      <StatCard
        title="Tempo Médio"
        value={`${stats.averageResponseTime}min`}
        icon={TrendingUp}
        change={`${stats.satisfactionRate}% satisfação`}
        positive={stats.averageResponseTime < 60}
      />
    </div>
  )
}
