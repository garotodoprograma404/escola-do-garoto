// Admin finance service
//
// Chamador fino da API (`/api/admin/finance/*`, só admin). As contas (receita, comissão, saldo,
// fluxo de caixa, fiscal) são feitas no banco pela API; aqui só se pede e se devolve no formato
// que as telas já usam.
import { apiServer } from '@/lib/server-api'
import type {
  AdminRefundRequest,
  FinancialMetrics,
  WithdrawalRequest,
  Transaction,
  LiquidityData,
  FinanceFilters,
} from '../types'

const EMPTY_METRICS: FinancialMetrics = {
  totalRevenue: 0,
  monthlyRevenue: 0,
  pendingWithdrawals: 0,
  availableBalance: 0,
  totalCommissions: 0,
  refundRate: 0,
  averageTicket: 0,
  transactionCount: 0,
}

export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const result = await apiServer<FinancialMetrics>('/admin/finance/metrics')
  if (!result.ok) {
    console.error('Error fetching financial metrics:', result.error.message)
    return EMPTY_METRICS
  }
  return result.data
}

export async function getWithdrawalRequests(filters: FinanceFilters): Promise<WithdrawalRequest[]> {
  const result = await apiServer<WithdrawalRequest[]>('/admin/finance/withdrawals', {
    query: {
      searchTerm: filters.searchTerm || undefined,
      status: filters.status,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      producerId: filters.producerId,
    },
  })

  if (!result.ok) {
    console.error('Error fetching withdrawal requests:', result.error.message)
    throw new Error('Erro ao buscar solicitações de saque')
  }
  return result.data
}

/** Pedidos de reembolso (os em aberto primeiro). Em erro, lista vazia: o resto da tela continua. */
export async function getRefundRequests(): Promise<AdminRefundRequest[]> {
  const result = await apiServer<AdminRefundRequest[]>('/admin/finance/refunds', {
    query: { status: 'all' },
  })
  if (!result.ok) {
    console.error('Error fetching refund requests:', result.error.message)
    return []
  }
  return result.data
}

export async function getLiquidityData(): Promise<LiquidityData> {
  const result = await apiServer<LiquidityData>('/admin/finance/liquidity')
  if (!result.ok) {
    console.error('Error fetching liquidity data:', result.error.message)
    return {
      currentBalance: 0,
      projectedIncome: 0,
      pendingPayments: 0,
      availableForWithdrawal: 0,
      reservedAmount: 0,
      nextPaymentDate: new Date().toISOString(),
      cashFlow: [],
    }
  }
  return result.data
}

export async function getTransactions(): Promise<Transaction[]> {
  const result = await apiServer<Transaction[]>('/admin/finance/transactions')
  if (!result.ok) {
    console.error('Error fetching transactions for finance:', result.error.message)
    return []
  }
  return result.data
}
