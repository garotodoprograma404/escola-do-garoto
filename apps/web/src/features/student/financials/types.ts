// Student Financials Types

export interface StudentTransaction {
  id: string
  amount: number
  type: 'purchase' | 'refund'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  payment_method: string
  course_id: string
  course_title: string
  course_thumbnail: string | null
  producer_name: string
  created_at: string
  /** Até quando dá para pedir reembolso desta compra; `null` = não dá (prazo, já pediu, grátis). */
  refund_deadline: string | null
  refund_request: RefundRequestInfo | null
}

type RefundStage = 'requested' | 'approved' | 'completed' | 'rejected'

export interface RefundRequestInfo {
  id: string
  stage: RefundStage
  reason: string | null
  rejection_reason: string | null
  requested_at: string
}

export interface FinancialStats {
  total_spent: number
  total_refunded: number
  total_courses_purchased: number
  average_course_price: number
  last_purchase_date: string | null
  primary_payment_method: string | null
}

export interface PurchaseHistoryFilters {
  searchTerm: string
  year: string
  status: 'all' | 'completed' | 'refunded'
}
