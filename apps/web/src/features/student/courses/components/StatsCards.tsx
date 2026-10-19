// =====================================================
// STUDENT COURSES STATS CARDS - SERVER COMPONENT
// =====================================================

import { BookOpen, TrendingUp, Award, Clock } from 'lucide-react'
import type { StudentCoursesStats } from '../types'

interface StatsCardsProps {
  stats: StudentCoursesStats
}

function formatWatchTime(totalHoursWatched: number): string {
  const totalMinutes = Math.max(0, Math.round(totalHoursWatched * 60))
  if (totalMinutes === 0) return '0min'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total de Cursos',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Em Andamento',
      value: stats.inProgressCourses,
      icon: TrendingUp,
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Concluídos',
      value: stats.completedCourses,
      icon: Award,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Horas Assistidas',
      value: formatWatchTime(stats.totalHoursWatched),
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
          >
            <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                  {card.title}
                </p>
                <div className={`rounded-lg p-2.5 sm:p-3 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold leading-none sm:mt-2 sm:text-3xl">{card.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
