// =====================================================
// PRODUCER ANALYTICS - PUBLIC API
// =====================================================

export { getProducerAnalytics } from './services/analyticsService'
export { getProducerEngagement } from './services/engagementService'
export { EngagementCard } from './components/EngagementCard'
export { MetricsCards } from './components/MetricsCards'
export { AnalyticsFilters } from './components/AnalyticsFilters.client'
export { StudentGrowthChart } from './components/StudentGrowthChart.client'
export { CompletionChart } from './components/CompletionChart.client'
export { RetentionFunnelChart } from './components/RetentionFunnelChart.client'
export { SalesOriginChart } from './components/SalesOriginChart.client'
export { CoursePerformanceTable } from './components/CoursePerformanceTable'

export type { AnalyticsFilters as AnalyticsFiltersType } from './types'
