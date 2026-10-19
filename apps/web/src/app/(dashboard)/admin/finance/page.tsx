import { Suspense } from 'react'
import { ReportExportButton } from '@/features/admin/finance'
import { FinanceManagementContent } from '@/features/admin/finance/components/FinanceManagementContent.client'
import {
  getFinancialMetrics,
  getWithdrawalRequests,
  getTransactions,
} from '@/features/admin/finance/services/financeService'

async function FinanceContent() {
  const [metrics, withdrawals, transactions] = await Promise.all([
    getFinancialMetrics(),
    getWithdrawalRequests({
      searchTerm: '',
      status: 'ALL',
      dateFrom: '',
      dateTo: '',
      producerId: 'ALL',
    }),
    getTransactions(),
  ])

  return (
    <FinanceManagementContent
      metrics={metrics}
      withdrawals={withdrawals}
      transactions={transactions}
    />
  )
}

function FinanceSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function AdminFinancePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            Gestão Financeira
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitore métricas, aprove saques e gerencie o fluxo de caixa da plataforma.
          </p>
        </div>
        <ReportExportButton />
      </div>

      {/* Content */}
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceContent />
      </Suspense>
    </div>
  )
}
