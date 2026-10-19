import { apiServer } from '@/lib/server-api'
import type { DashboardStats, RevenueChartData, RecentSale, CoursePerformance } from '../types'

/**
 * Lê um pedaço do dashboard na API. O produtor é sempre o da sessão (a API não aceita id vindo
 * daqui); se der erro, a tela continua com o valor vazio.
 */
async function loadDashboardPart<T>(path: `/${string}`, fallback: T, label: string): Promise<T> {
  const result = await apiServer<T>(path)
  if (!result.ok) {
    console.error(`Error fetching ${label}:`, result.error.message)
    return fallback
  }
  return result.data
}

export const producerDashboardService = {
  /** Estatísticas do dashboard do produtor logado. */
  async getDashboardStats(_producerId: string): Promise<DashboardStats> {
    return loadDashboardPart(
      '/producer/dashboard/stats',
      {
        totalCourses: 0,
        totalStudents: 0,
        totalRevenue: 0,
        monthRevenue: 0,
        pendingWithdrawals: 0,
        averageRating: null,
      },
      'dashboard stats',
    )
  },

  /** Receita dos últimos 30 dias, por dia. */
  async getRevenueChartData(_producerId: string): Promise<RevenueChartData[]> {
    return loadDashboardPart('/producer/dashboard/revenue', [], 'revenue chart data')
  },

  /** Últimas 5 vendas. */
  async getRecentSales(_producerId: string): Promise<RecentSale[]> {
    return loadDashboardPart('/producer/dashboard/recent-sales', [], 'recent sales')
  },

  /** Desempenho dos cursos publicados com mais alunos. */
  async getCoursePerformance(_producerId: string): Promise<CoursePerformance[]> {
    return loadDashboardPart('/producer/dashboard/course-performance', [], 'course performance')
  },
}
