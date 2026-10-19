import { Suspense } from 'react'
import { Shield, DollarSign, Users, BookOpen, AlertCircle } from 'lucide-react'
import { StatCard } from '@/features/admin/components/StatCard'
import {
  ActivityChart,
  CategoryChart,
  RecentActivityTable,
  getDashboardMetrics,
  getActivityChartData,
  getCategoryDistribution,
  getRecentActivities,
} from '@/features/admin/dashboard'
import { Button } from '@/shared/components/ui/button'
import { measureOperation } from '@/shared/lib/observability'

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`
  }
  return `R$ ${value}`
}

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

async function DashboardContent() {
  const [metrics, activityData, categoryData, recentActivities] = await Promise.all([
    measureOperation('route.admin.dashboard.metrics', () => getDashboardMetrics(), {
      route: '/admin',
    }),
    measureOperation('route.admin.dashboard.activity', () => getActivityChartData(), {
      route: '/admin',
    }),
    measureOperation('route.admin.dashboard.categories', () => getCategoryDistribution(), {
      route: '/admin',
    }),
    measureOperation('route.admin.dashboard.recent', () => getRecentActivities(), {
      route: '/admin',
    }),
  ])

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita Total (Plataforma)"
          value={formatCurrency(metrics.totalRevenue)}
          change={`+${metrics.revenueChange}%`}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Usuários Ativos"
          value={formatNumber(metrics.activeUsers)}
          change={`+${metrics.usersChange}%`}
          icon={Users}
          positive
        />
        <StatCard
          title="Cursos Publicados"
          value={formatNumber(metrics.publishedCourses)}
          change={`+${metrics.coursesChange}%`}
          icon={BookOpen}
          positive
        />
        <StatCard
          title="Aprovações Pendentes"
          value={`${metrics.pendingApprovals} Cursos`}
          change="Ação Necessária"
          icon={AlertCircle}
          variant="warning"
          positive={false}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart data={activityData} />
        </div>
        <div>
          <CategoryChart data={categoryData} />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivityTable activities={recentActivities} />
    </>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Shield className="text-brand-500" size={24} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visão Geral</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Monitoramento em tempo real da plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Content with Suspense */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
