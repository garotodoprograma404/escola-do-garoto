// Student Financials Service
//
// Chamador fino da API (`/api/finance/student/*`). A API filtra SEMPRE pelo usuário da sessão: os
// parâmetros `userId` abaixo continuam existindo só para não quebrar quem chama, e são ignorados.
import { apiServer } from '@/lib/server-api'
import type { StudentTransaction, FinancialStats, PurchaseHistoryFilters } from '../types'

const EMPTY_STATS: FinancialStats = {
  total_spent: 0,
  total_refunded: 0,
  total_courses_purchased: 0,
  average_course_price: 0,
  last_purchase_date: null,
  primary_payment_method: null,
}

export async function getTransactions(
  filters?: PurchaseHistoryFilters,
  _userId?: string,
): Promise<StudentTransaction[]> {
  const result = await apiServer<StudentTransaction[]>('/finance/student/transactions', {
    query: {
      searchTerm: filters?.searchTerm || undefined,
      year: filters?.year && filters.year !== 'all' ? filters.year : undefined,
      status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
    },
  })

  if (!result.ok) {
    console.error('Error fetching transactions:', result.error.message)
    return []
  }
  return result.data
}

export async function getFinancialStats(_userId?: string): Promise<FinancialStats> {
  const result = await apiServer<FinancialStats>('/finance/student/stats')

  if (!result.ok) {
    console.error('Error fetching financial stats:', result.error.message)
    return EMPTY_STATS
  }
  return result.data
}
