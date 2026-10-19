import { apiServer } from '@/lib/server-api'
import type { AffiliateDashboardData } from '../types'

/**
 * Painel do afiliado logado: parcerias aprovadas, links e métricas (cliques, vendas, comissões).
 * A API calcula tudo pela sessão (e libera as comissões que já passaram da janela de reembolso).
 */
export async function getAffiliateDashboardData(): Promise<AffiliateDashboardData> {
  const result = await apiServer<AffiliateDashboardData>('/affiliate/dashboard')
  if (!result.ok) {
    throw new Error(`Erro ao carregar o painel do afiliado: ${result.error.message}`)
  }
  return result.data
}
