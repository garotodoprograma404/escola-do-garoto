import { Flame, Medal, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { ProducerEngagement } from '../types'

/** Bloco de engajamento: quantos alunos estão com a sequência ativa, medalhas e pontos do mês. */
export function EngagementCard({ engagement }: { engagement: ProducerEngagement }) {
  const percent = (value: number) =>
    engagement.students > 0 ? Math.round((value / engagement.students) * 100) : 0
  const items = [
    {
      icon: Flame,
      color: 'text-orange-500',
      label: 'Estudando em sequência',
      value: `${engagement.studentsWithActiveStreak} de ${engagement.students}`,
      hint: `${percent(engagement.studentsWithActiveStreak)}% dos alunos estudaram hoje ou ontem · média de ${engagement.averageActiveStreak.toLocaleString('pt-BR')} dias seguidos`,
    },
    {
      icon: Medal,
      color: 'text-amber-500',
      label: 'Alunos com medalha',
      value: `${engagement.studentsWithBadges}`,
      hint: `${percent(engagement.studentsWithBadges)}% dos alunos já conquistaram pelo menos uma`,
    },
    {
      icon: Sparkles,
      color: 'text-purple-500',
      label: 'Pontos (XP) no mês',
      value: engagement.xpThisMonth.toLocaleString('pt-BR'),
      hint: 'Ganhos pelos alunos nos seus cursos (aulas, quiz, avaliações)',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engajamento dos alunos</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Gamificação: sequência de estudos, medalhas e pontos.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="space-y-1 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <item.icon aria-hidden="true" className={`h-4 w-4 ${item.color}`} />
              {item.label}
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{item.hint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
