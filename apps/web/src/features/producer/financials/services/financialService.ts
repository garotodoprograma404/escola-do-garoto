// =====================================================
// PRODUCER FINANCIALS - SERVICE
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { ProducerFinancials, DateRangeFilter, TransactionFilter } from '../types'

/**
 * Financeiro do produtor logado. O saldo e a lista são calculados na API (mesma conta que valida o
 * saque); `userId` fica só por compatibilidade com quem já chama.
 */
export async function getProducerFinancials(
  _userId: string,
  dateRange: DateRangeFilter = '30d',
  transactionType: TransactionFilter = 'all',
): Promise<ProducerFinancials> {
  const result = await apiServer<ProducerFinancials>('/producer/financials', {
    query: { range: dateRange, type: transactionType },
  })

  if (!result.ok) {
    // Melhor mostrar erro do que um saldo "R$ 0,00" que parece verdade.
    console.error('Error fetching producer financials:', result.error.message)
    throw new Error('Não foi possível carregar o financeiro agora')
  }

  return result.data
}
