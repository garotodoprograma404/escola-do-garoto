import { apiServer } from '@/lib/server-api'
import type { AffiliateAdminDashboardData } from '../types'

/**
 * Painel de admin de afiliados: candidaturas, afiliados, parcerias e auditoria de vendas.
 * A API exige o papel admin, libera as comissões vencidas e já traz o e-mail de cada afiliado.
 */
export async function getAffiliateAdminDashboardData(): Promise<AffiliateAdminDashboardData> {
  const result = await apiServer<AffiliateAdminDashboardData>('/admin/affiliates/dashboard')
  if (!result.ok) {
    throw new Error(`Erro ao carregar afiliados: ${result.error.message}`)
  }
  return result.data
}
