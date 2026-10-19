// =====================================================
// PRODUCER FINANCIALS - TYPES
// =====================================================

export interface FinancialBalance {
  available: number // Saldo disponível para saque
  pending: number // Saldo pendente (aguardando compensação)
  total: number // Total acumulado
  lifetime: number // Total histórico
}

export interface Transaction {
  id: string
  type: 'sale' | 'withdrawal' | 'refund' | 'commission'
  amount: number
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'refunded'
  description: string
  course_title?: string
  student_name?: string
  created_at: string
}

export interface ProducerFinancials {
  balance: FinancialBalance
  transactions: Transaction[]
  pending_withdrawals: number
}

export type TransactionFilter = 'all' | 'sale' | 'withdrawal' | 'refund' | 'commission'
export type DateRangeFilter = '7d' | '30d' | '90d' | 'all'
