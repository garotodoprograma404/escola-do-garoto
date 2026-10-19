import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { DollarSign, CreditCard, Calendar } from 'lucide-react'
import type { FinancialStats } from '../types'

interface StudentFinancialSummaryProps {
  stats: FinancialStats
}

export function StudentFinancialSummary({ stats }: StudentFinancialSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Não informado'
    if (method.includes('credit')) return 'Cartão de Crédito'
    if (method.includes('pix')) return 'PIX'
    if (method.includes('boleto')) return 'Boleto'
    return method
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {/* Total Investido */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
            Total Investido
          </CardTitle>
          <div className="rounded-lg bg-green-100 p-2 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <DollarSign size={18} />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="text-lg font-bold text-slate-900 dark:text-white sm:text-2xl">
            {formatCurrency(stats.total_spent)}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {stats.total_courses_purchased} curso(s) adquirido(s)
          </p>
        </CardContent>
      </Card>

      {/* Método Principal */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
            Método Principal
          </CardTitle>
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <CreditCard size={18} />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            {getPaymentMethodLabel(stats.primary_payment_method)}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Último método utilizado</p>
        </CardContent>
      </Card>

      {/* Última Compra */}
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
          <CardTitle className="text-xs font-medium leading-tight sm:text-sm">
            Última Compra
          </CardTitle>
          <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Calendar size={18} />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            {formatDate(stats.last_purchase_date)}
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Ticket médio: {formatCurrency(stats.average_course_price)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
