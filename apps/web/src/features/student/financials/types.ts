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
