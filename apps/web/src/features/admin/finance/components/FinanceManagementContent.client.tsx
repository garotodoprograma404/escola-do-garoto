'use client'

import { useState } from 'react'
import { HealthMetricsPanel } from './HealthMetricsPanel'
import { WithdrawalListTable } from './WithdrawalListTable'
import { WithdrawalAuditDrawer } from './WithdrawalAuditDrawer'
import { TransactionHistoryTable } from './TransactionHistoryTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  approveWithdrawalAction,
  payWithdrawalAction,
  rejectWithdrawalAction,
} from '../actions/withdrawal-actions'
import { useToast } from '@/shared/hooks/use-toast'
import type { FinancialMetrics, WithdrawalRequest, Transaction } from '../types'

interface FinanceManagementContentProps {
  metrics: FinancialMetrics
  withdrawals: WithdrawalRequest[]
  transactions: Transaction[]
}

export function FinanceManagementContent({
  metrics,
  withdrawals,
  transactions,
}: FinanceManagementContentProps) {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { toast } = useToast()

  const handleView = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal)
    setIsDrawerOpen(true)
  }

  const handleApprove = async (id: string) => {
    try {
      await approveWithdrawalAction(id)
      toast({
        title: 'Saque aprovado',
        description: 'O saque foi aprovado com sucesso.',
      })
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Erro ao aprovar',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const handlePay = async (id: string) => {
    try {
      await payWithdrawalAction(id)
      toast({
        title: 'Saque pago',
        description: 'O saque foi marcado como pago e a pessoa foi avisada.',
      })
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectWithdrawalAction(id, reason)
      toast({
        title: 'Saque rejeitado',
        description: 'O saque foi rejeitado.',
      })
      window.location.reload()
    } catch (error) {
      toast({
        title: 'Erro ao rejeitar',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length

  return (
    <div className="space-y-8">
      <HealthMetricsPanel metrics={metrics} />

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800">
          <TabsList className="bg-transparent">
            <TabsTrigger
              value="withdrawals"
              className="border-b-2 px-3 py-4 text-sm font-medium transition-colors hover:text-slate-700 data-[state=active]:border-brand-500 data-[state=inactive]:border-transparent data-[state=active]:text-brand-600 data-[state=inactive]:text-slate-500 dark:hover:text-slate-200 dark:data-[state=active]:text-brand-400 dark:data-[state=inactive]:text-slate-400 sm:px-6"
            >
              <span className="flex items-center gap-2">
                Solicitações de Saque
                {pendingCount > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                    {pendingCount}
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="border-b-2 px-3 py-4 text-sm font-medium transition-colors hover:text-slate-700 data-[state=active]:border-brand-500 data-[state=inactive]:border-transparent data-[state=active]:text-brand-600 data-[state=inactive]:text-slate-500 dark:hover:text-slate-200 dark:data-[state=active]:text-brand-400 dark:data-[state=inactive]:text-slate-400 sm:px-6"
            >
              Histórico de Transações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="withdrawals">
          <WithdrawalListTable withdrawals={withdrawals} onView={handleView} />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistoryTable transactions={transactions} />
        </TabsContent>
      </Tabs>

      <WithdrawalAuditDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        withdrawal={selectedWithdrawal}
        onApprove={handleApprove}
        onReject={handleReject}
        onPay={handlePay}
      />
    </div>
  )
}
