// =====================================================
// PRODUCER ACADEMY - STATS CARDS
// =====================================================

import { BookOpen, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import type { AcademyStats } from '../types'

interface StatsCardsProps {
  stats: AcademyStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total de Conteúdos
            </p>
            <div className="rounded-lg bg-blue-50 p-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalContent}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Concluídos</p>
            <div className="rounded-lg bg-green-50 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.completedContent}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tempo Total</p>
            <div className="rounded-lg bg-purple-50 p-2">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalMinutes} min
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Progresso</p>
            <div className="rounded-lg bg-orange-50 p-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.progressPercentage.toFixed(0)}%
          </p>
          <Progress value={stats.progressPercentage} className="h-2" />
        </CardContent>
      </Card>
    </div>
  )
}
