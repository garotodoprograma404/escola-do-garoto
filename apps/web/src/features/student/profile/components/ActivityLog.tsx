import { BookOpen, CheckCircle, FileText, Award, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { ActivityLogType } from '../types'

interface ActivityLogProps {
  activities: ActivityLogType[]
}

const activityIcons: Record<ActivityLogType['type'], LucideIcon> = {
  enrollment: BookOpen,
  completion: CheckCircle,
  certificate: Award,
  note: FileText,
  review: FileText,
}

const activityColors: Record<ActivityLogType['type'], string> = {
  enrollment: 'text-blue-600',
  completion: 'text-green-600',
  certificate: 'text-yellow-600',
  note: 'text-purple-600',
  review: 'text-orange-600',
}

export function ActivityLog({ activities }: ActivityLogProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-muted-foreground">Nenhuma atividade recente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>Histórico de Atividades</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-3 sm:space-y-4">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div
                key={activity.id}
                className="flex items-start gap-2.5 border-b pb-3 last:border-0 last:pb-0 sm:gap-3 sm:pb-4"
              >
                <div className={`mt-1 ${colorClass}`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
