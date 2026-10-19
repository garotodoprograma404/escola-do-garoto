// Finance management types

export type WithdrawalStatus =
  'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled'
type TransactionType =
  'sale' | 'withdrawal' | 'refund' | 'commission' | 'anticipation' | 'affiliate_commission'

export interface FinancialMetrics {
  totalRevenue: number
  monthlyRevenue: number
  pendingWithdrawals: number
  availableBalance: number
  totalCommissions: number
  refundRate: number
  averageTicket: number
  transactionCount: number
}

export interface WithdrawalRequest {
  id: string
  producerId: string
  producerName: string
  producerEmail: string
  accountScope: 'producer' | 'affiliate'
  method: 'pix' | 'bank_transfer'
  amount: number
  fee: number
  netAmount: number
  status: WithdrawalStatus
  requestedAt: string
  processedAt: string | null
  approvedBy: string | null
  rejectedReason: string | null
  bankAccount: {
    bank: string
    agency: string
    account: string
    accountType: 'checking' | 'savings'
    holderName: string
    holderDocument: string
  }
  metadata: {
    courseSales: number
    period: string
  }
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  fee: number
  netAmount: number
  status: 'pending' | 'completed' | 'failed'
  userId: string
  userName: string
  courseId?: string
  courseName?: string
  description: string
  createdAt: string
  completedAt: string | null
}

export interface LiquidityData {
  currentBalance: number
  projectedIncome: number
  pendingPayments: number
  availableForWithdrawal: number
  reservedAmount: number
  nextPaymentDate: string
  cashFlow: {
    date: string
    income: number
    outcome: number
    balance: number
  }[]
}

export interface FinanceFilters {
  searchTerm: string
  status: WithdrawalStatus | 'ALL'
  dateFrom: string
  dateTo: string
  producerId: string | 'ALL'
}
