import { BarChart3, Handshake, Link2, MousePointerClick, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatCurrency, formatPercentage } from '@/shared/lib/utils'
import type { AffiliateDashboardSummary } from '../types'

interface AffiliateOverviewStatsProps {
  summary: AffiliateDashboardSummary
}

const statItems = [
  {
    key: 'approvedPartnerships',
    label: 'Parcerias aprovadas',
    icon: Handshake,
    formatter: (value: number) => value.toString(),
  },
  {
    key: 'activeLinks',
    label: 'Links ativos',
    icon: Link2,
    formatter: (value: number, summary: AffiliateDashboardSummary) =>
      `${value} de ${summary.totalLinks}`,
  },
  {
    key: 'totalClicks',
    label: 'Cliques rastreados',
    icon: MousePointerClick,
    formatter: (value: number) => value.toString(),
  },
  {
    key: 'conversionRate',
    label: 'Conversão bruta',
    icon: BarChart3,
    formatter: (value: number) => formatPercentage(value),
  },
  {
    key: 'netConversionRate',
    label: 'Conversão líquida',
    icon: BarChart3,
    formatter: (value: number) => formatPercentage(value),
  },
  {
    key: 'attributedRevenue',
    label: 'Receita atribuída',
    icon: Wallet,
    formatter: (value: number) => formatCurrency(value),
  },
  {
    key: 'availableCommission',
    label: 'Comissão disponível',
    icon: Wallet,
    formatter: (value: number) => formatCurrency(value),
  },
] as const

export function AffiliateOverviewStats({ summary }: AffiliateOverviewStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {statItems.map((item) => {
        const Icon = item.icon
        const value = summary[item.key]

        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.formatter(value, summary)}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
