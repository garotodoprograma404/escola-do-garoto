// Public API for admin dashboard feature
export { ActivityChart } from './components/ActivityChart'
export { CategoryChart } from './components/CategoryChart'
export { RecentActivityTable } from './components/RecentActivityTable'
export {
  getDashboardMetrics,
  getActivityChartData,
  getCategoryDistribution,
  getRecentActivities,
} from './services/dashboardService'
