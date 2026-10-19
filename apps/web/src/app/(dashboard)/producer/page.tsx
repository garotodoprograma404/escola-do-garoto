import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  DashboardStats,
  RevenueChart,
  RecentSales,
  CoursePerformanceTable,
  producerDashboardService,
} from '@/features/producer/dashboard'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { measureOperation } from '@/shared/lib/observability'

async function DashboardContent({ userId }: { userId: string }) {
  const [stats, revenueData, recentSales, coursePerformance] = await Promise.all([
    measureOperation(
      'route.producer.dashboard.stats',
      () => producerDashboardService.getDashboardStats(userId),
      { route: '/producer', userId },
    ),
    measureOperation(
      'route.producer.dashboard.revenue',
      () => producerDashboardService.getRevenueChartData(userId),
      { route: '/producer', userId },
    ),
    measureOperation(
      'route.producer.dashboard.sales',
      () => producerDashboardService.getRecentSales(userId),
      { route: '/producer', userId },
    ),
    measureOperation(
      'route.producer.dashboard.performance',
      () => producerDashboardService.getCoursePerformance(userId),
      { route: '/producer', userId },
    ),
  ])

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Revenue Chart */}
      <RevenueChart data={revenueData} />

      {/* Recent Sales and Course Performance */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <RecentSales sales={recentSales} />
        <CoursePerformanceTable courses={coursePerformance} />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Skeleton className="h-[220px] w-full sm:h-[260px]" />
        </CardContent>
      </Card>

      {/* Tables Skeleton */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-[180px] w-full sm:h-[220px]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-[180px] w-full sm:h-[220px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function ProducerDashboardPage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('producer')) {
    redirect('/become-producer')
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Acompanhe o desempenho dos seus cursos e vendas
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={authContext.userId} />
      </Suspense>
    </div>
  )
}
