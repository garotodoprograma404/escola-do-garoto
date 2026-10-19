// =====================================================
// PRODUCER ANALYTICS - TYPES
// =====================================================

export interface AnalyticsFilters {
  courseId?: string
  dateRange: '7d' | '30d' | '90d' | '1y' | 'all'
}

export interface AnalyticsMetrics {
  totalStudents: number
  newStudents: number
  totalRevenue: number
  averageRating: number
  completionRate: number
  activeStudents: number
}

export interface StudentGrowth {
  date: string
  count: number
}

export interface CompletionStats {
  completed: number
  inProgress: number
  notStarted: number
}

export interface RetentionFunnel {
  stage: string
  count: number
  percentage: number
}

export interface SalesOrigin {
  source: string
  count: number
  revenue: number
}

export interface CoursePerformance {
  courseId: string
  courseTitle: string
  students: number
  revenue: number
  rating: number
  completionRate: number
  activeStudents: number
}

export interface ProducerAnalytics {
  metrics: AnalyticsMetrics
  studentGrowth: StudentGrowth[]
  completionStats: CompletionStats
  retentionFunnel: RetentionFunnel[]
  salesOrigins: SalesOrigin[]
  coursePerformance: CoursePerformance[]
}

/** Engajamento dos alunos pela gamificação (`GET /api/producer/gamification/engagement`). */
export interface ProducerEngagement {
  students: number
  studentsWithActiveStreak: number
  averageActiveStreak: number
  studentsWithBadges: number
  xpThisMonth: number
}
