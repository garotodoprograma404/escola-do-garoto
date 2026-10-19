// =====================================================
// NOTES STATS - SERVER COMPONENT
// =====================================================

import { Card, CardContent } from '@/shared/components/ui/card'
import { BookOpen, Calendar, FileText, TrendingUp } from 'lucide-react'
import type { NotesStats } from '../types'

interface NotesStatsProps {
  stats: NotesStats
}

export function NotesStats({ stats }: NotesStatsProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Nenhuma nota ainda'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                Total de Notas
              </p>
              <FileText className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
            <p className="text-2xl font-bold leading-none sm:mt-2 sm:text-3xl">
              {stats.total_notes}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                Esta Semana
              </p>
              <TrendingUp className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
            <p className="text-2xl font-bold leading-none sm:mt-2 sm:text-3xl">
              {stats.notes_this_week}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                Cursos com Notas
              </p>
              <BookOpen className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
            <p className="text-2xl font-bold leading-none sm:mt-2 sm:text-3xl">
              {stats.courses_with_notes}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex min-h-[118px] flex-col justify-between gap-3 sm:min-h-[136px]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium leading-tight text-muted-foreground sm:text-sm">
                Última Nota
              </p>
              <Calendar className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
            </div>
            <p className="text-lg font-bold leading-tight sm:mt-2 sm:text-xl">
              {formatDate(stats.last_note_date)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
