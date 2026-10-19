import { Users, Handshake, Activity, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { AffiliateAdminStats } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface AffiliateStatsProps {
  stats: AffiliateAdminStats
}

export function AffiliateStats({ stats }: AffiliateStatsProps) {
  const cards = [
    {
      title: 'Afiliados ativos',
      value: `${stats.activeAffiliates}/${stats.totalAffiliates}`,
      description: `${stats.pendingApplications} candidaturas aguardando revisão`,
      icon: Users,
    },
    {
      title: 'Parcerias aprovadas',
      value: String(stats.approvedPartnerships),
      description: `${stats.pendingPartnerships} aguardando revisão`,
      icon: Handshake,
    },
    {
      title: 'Vendas rastreadas',
      value: String(stats.trackedSales),
      description: 'Comissões geradas no ledger',
      icon: Activity,
    },
    {
      title: 'Comissões do afiliado',
      value: formatCurrency(stats.affiliateCommissionTotal),
      description: 'Soma histórica de affiliate_commission',
      icon: Wallet,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
