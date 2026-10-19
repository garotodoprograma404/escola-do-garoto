import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { StudentFinancialsContent } from './StudentFinancialsContent.client'
import {
  getTransactions,
  getFinancialStats,
} from '@/features/student/financials/services/financialsService'
import { getCurrentUser } from '@/lib/session'

export const metadata = {
  title: 'Financeiro',
  description: 'Histórico de compras e transações',
}

async function FinancialsData() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // A API filtra pelo usuário da sessão: nenhum id de usuário é enviado.
  const [transactions, stats] = await Promise.all([getTransactions(), getFinancialStats()])

  return <StudentFinancialsContent transactions={transactions} stats={stats} />
}

function FinancialsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-56 sm:w-96" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

export default function StudentFinancialsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2 sm:space-y-8 sm:py-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Histórico Financeiro
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Acompanhe seus investimentos e baixe notas fiscais
          </p>
        </div>
      </div>

      <Suspense fallback={<FinancialsSkeleton />}>
        <FinancialsData />
      </Suspense>
    </div>
  )
}
