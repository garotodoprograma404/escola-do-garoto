// =====================================================
// PRODUCER FINANCIALS - PAGE
// =====================================================

import { redirect } from 'next/navigation'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  getProducerFinancials,
  BalanceCards,
  WithdrawalButton,
  TransactionFilters,
  TransactionTable,
} from '@/features/producer/financials'
import type { TransactionFilter, DateRangeFilter } from '@/features/producer/financials'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

const TRANSACTION_FILTER_VALUES: TransactionFilter[] = [
  'all',
  'sale',
  'withdrawal',
  'refund',
  'commission',
]
const DATE_RANGE_FILTER_VALUES: DateRangeFilter[] = ['7d', '30d', '90d', 'all']

interface PageProps {
  searchParams: Promise<{
    type?: string
    range?: string
  }>
}

export default async function ProducerFinancialsPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/dashboard')
  }

  // Get search params
  const params = await searchParams
  const transactionType = TRANSACTION_FILTER_VALUES.includes(params.type as TransactionFilter)
    ? (params.type as TransactionFilter)
    : 'all'
  const dateRange = DATE_RANGE_FILTER_VALUES.includes(params.range as DateRangeFilter)
    ? (params.range as DateRangeFilter)
    : '30d'

  // Fetch financial data
  const financials = await getProducerFinancials(authContext.userId, dateRange, transactionType)
  const shouldShowFilters =
    financials.transactions.length > 0 || transactionType !== 'all' || dateRange !== '30d'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Gerencie seus ganhos e solicitações de saque</p>
        </div>
        <WithdrawalButton availableBalance={financials.balance.available} />
      </div>

      {/* Balance Cards */}
      <BalanceCards balance={financials.balance} />

      {/* Pending Withdrawals Alert */}
      {financials.pending_withdrawals > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Saques Pendentes</AlertTitle>
          <AlertDescription>
            Você tem {financials.pending_withdrawals} solicitação(ões) de saque em processamento.
          </AlertDescription>
        </Alert>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>Visualize todas as suas transações financeiras</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {shouldShowFilters && <TransactionFilters />}
          {financials.transactions.length > 0 ? (
            <TransactionTable transactions={financials.transactions} />
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma movimentação financeira registrada até o momento.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
