import { apiServer } from '@/lib/server-api'
import type {
  ProducerFinancials as AffiliateFinancials,
  DateRangeFilter,
  TransactionFilter,
} from '@/features/producer/financials'

/**
 * Saldo e extrato (comissões e saques) do afiliado logado. O saldo é calculado na API; saque só
 * enxerga comissão já liberada (depois da janela de reembolso).
 */
export async function getAffiliateFinancials(
  dateRange: DateRangeFilter = '30d',
  transactionType: TransactionFilter = 'all',
): Promise<AffiliateFinancials> {
  const result = await apiServer<AffiliateFinancials>('/affiliate/financials', {
    query: { range: dateRange, type: transactionType },
  })
  if (!result.ok) {
    throw new Error(`Erro ao carregar o financeiro do afiliado: ${result.error.message}`)
  }
  return result.data
}
