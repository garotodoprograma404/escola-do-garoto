export interface DashboardMetrics {
  totalRevenue: number
  revenueChange: number
  activeUsers: number
  usersChange: number
  publishedCourses: number
  coursesChange: number
  pendingApprovals: number
}

export interface ActivityChartData {
  name: string
  users: number
  revenue: number
}

export interface CategoryDistribution {
  name: string
  value: number
}

export interface RecentActivity {
  id: string
  user: {
    id: string
    name: string
    avatar?: string
  }
  action: string
  status: 'completed' | 'pending' | 'failed'
  timestamp: string
}
