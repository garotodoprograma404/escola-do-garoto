import { apiServer } from '@/lib/server-api'
import type {
  DashboardMetrics,
  ActivityChartData,
  CategoryDistribution,
  RecentActivity,
} from '../types'

/**
 * Números do painel do admin. As contas (receita, variação, gráficos) são agregações SQL na API
 * (`/api/admin/dashboard/*`, só para admin): o front só mostra.
 */

const EMPTY_METRICS: DashboardMetrics = {
  totalRevenue: 0,
  revenueChange: 0,
  activeUsers: 0,
  usersChange: 0,
  publishedCourses: 0,
  coursesChange: 0,
  pendingApprovals: 0,
}

async function fetchDashboard<T>(path: `/${string}`, fallback: T): Promise<T> {
  const result = await apiServer<T>(`/admin/dashboard${path}`)
  if (!result.ok) {
    console.error(`Error fetching admin dashboard ${path}:`, result.error.message)
    return fallback
  }
  return result.data
}

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchDashboard('/metrics', EMPTY_METRICS)
}

export function getActivityChartData(): Promise<ActivityChartData[]> {
  return fetchDashboard('/activity', [])
}

export function getCategoryDistribution(): Promise<CategoryDistribution[]> {
  return fetchDashboard('/categories', [])
}

export function getRecentActivities(): Promise<RecentActivity[]> {
  return fetchDashboard('/recent', [])
}
