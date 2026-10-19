import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar } from '@/shared/components/ui/avatar'
import type { RecentSale } from '../types'

interface RecentSalesProps {
  sales: RecentSale[]
}

export function RecentSales({ sales }: RecentSalesProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Agora mesmo'
    if (diffInHours < 24) return `Há ${diffInHours}h`
    if (diffInHours < 48) return 'Ontem'
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const getStatusBadge = (status: RecentSale['status']) => {
    const variants = {
      completed: { label: 'Concluída', variant: 'default' as const },
      pending: { label: 'Pendente', variant: 'secondary' as const },
      refunded: { label: 'Reembolsada', variant: 'destructive' as const },
    }
    return variants[status]
  }

  if (!sales || sales.length === 0) {
    return (
      <Card>
        <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-xl">Vendas Recentes</CardTitle>
          <CardDescription>Suas últimas 5 vendas</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground sm:min-h-[180px] sm:text-base">
            Nenhuma venda recente
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="text-xl">Vendas Recentes</CardTitle>
        <CardDescription>Suas últimas {sales.length} vendas</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        <div className="space-y-3 sm:space-y-4">
          {sales.map((sale) => {
            const statusBadge = getStatusBadge(sale.status)
            return (
              <div key={sale.id} className="rounded-lg border p-3 sm:p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium text-primary">
                        {sale.studentName.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.studentName}</p>
                      <p className="text-sm text-muted-foreground">{sale.courseName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(sale.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.date)}</p>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
