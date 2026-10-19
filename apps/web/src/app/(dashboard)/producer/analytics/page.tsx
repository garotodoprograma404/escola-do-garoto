// =====================================================
// PRODUCER ANALYTICS - PAGE
// Relatório do produtor: alunos, conclusão, funil, origem das vendas e desempenho por curso.
// =====================================================

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getProducerCourseOptions } from '@/features/producer/services/courseOptionsService'
import {
  AnalyticsFilters,
  CompletionChart,
  CoursePerformanceTable,
  EngagementCard,
  MetricsCards,
  RetentionFunnelChart,
  SalesOriginChart,
  StudentGrowthChart,
  getProducerAnalytics,
  getProducerEngagement,
  type AnalyticsFiltersType,
} from '@/features/producer/analytics'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'

export const metadata = { title: 'Analytics' }

interface PageProps {
  searchParams: Promise<{ courseId?: string; range?: string }>
}

const RANGES: AnalyticsFiltersType['dateRange'][] = ['7d', '30d', '90d', '1y', 'all']

function parseRange(value: string | undefined): AnalyticsFiltersType['dateRange'] {
  return RANGES.find((range) => range === value) ?? '30d'
}

async function AnalyticsContent({ filters }: { filters: AnalyticsFiltersType }) {
  const [analytics, engagement] = await Promise.all([
    getProducerAnalytics(filters),
    getProducerEngagement(filters.courseId),
  ])

  return (
    <div className="space-y-6">
      <MetricsCards metrics={analytics.metrics} />

      {engagement ? <EngagementCard engagement={engagement} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentGrowthChart data={analytics.studentGrowth} />
        <CompletionChart data={analytics.completionStats} />
        <RetentionFunnelChart data={analytics.retentionFunnel} />
        <SalesOriginChart data={analytics.salesOrigins} />
      </div>

      <CoursePerformanceTable data={analytics.coursePerformance} />
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full" />
        ))}
      </div>
    </div>
  )
}

export default async function ProducerAnalyticsPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/become-producer')
  }

  const params = await searchParams
  const filters: AnalyticsFiltersType = {
    dateRange: parseRange(params.range),
    courseId: params.courseId && /^\d+$/.test(params.courseId) ? params.courseId : undefined,
  }
  const courses = await getProducerCourseOptions()

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Veja como seus alunos avançam e de onde vêm as vendas
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full sm:w-[460px]" />}>
        <AnalyticsFilters courses={courses} />
      </Suspense>

      <Suspense
        key={`${filters.dateRange}-${filters.courseId ?? 'all'}`}
        fallback={<AnalyticsSkeleton />}
      >
        <AnalyticsContent filters={filters} />
      </Suspense>
    </div>
  )
}
