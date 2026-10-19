import { Card, CardContent } from '@/shared/components/ui/card'
import { Ticket, CheckCircle, Clock, MessageSquare } from 'lucide-react'
import type { SupportStats as SupportStatsType } from '../types'

interface SupportStatsProps {
  stats: SupportStatsType
}

export function SupportStats({ stats }: SupportStatsProps) {
  const statsData = [
    {
      title: 'Total de Tickets',
      value: stats.total_tickets.toString(),
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Tickets Abertos',
      value: stats.open_tickets.toString(),
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Tickets Resolvidos',
      value: stats.resolved_tickets.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tempo Médio de Resposta',
      value: `${stats.average_response_time}h`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon

        return (
          <Card key={stat.title}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-tight text-muted-foreground sm:text-sm">
                    {stat.title}
                  </p>
                  <div className={`${stat.bgColor} ${stat.color} rounded-full p-2.5 sm:p-3`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold leading-none sm:mt-2">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
