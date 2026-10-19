export interface DashboardStats {
  totalCourses: number
  totalStudents: number
  totalRevenue: number
  monthRevenue: number
  pendingWithdrawals: number
  averageRating: number | null
}

export interface RevenueChartData {
  date: string
  revenue: number
  sales: number
}

export interface RecentSale {
  id: number
  studentName: string
  courseName: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'refunded'
}

export interface CoursePerformance {
  id: number
  title: string
  students: number
  revenue: number
  rating: number | null
  completionRate: number
}
