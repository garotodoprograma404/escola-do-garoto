import Link from 'next/link'
import { Flame, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import type { GamificationSummary } from '../types'
import { BadgeIcon } from './BadgeIcon'

/** Card do painel do aluno: nível, barra até o próximo nível, sequência e últimas medalhas. */
export function GamificationCard({ summary }: { summary: GamificationSummary }) {
  const earned = summary.badges
    .filter((badge) => badge.earnedAt)
    .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''))
  const missing = summary.nextLevelXp - summary.xp

  return (
    <Card>
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {summary.level}
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Nível {summary.level}</p>
              <h2 className="text-lg font-semibold">{summary.levelName}</h2>
            </div>
            <p className="ml-auto text-sm font-semibold">{summary.xp} XP</p>
          </div>
          <Progress value={summary.levelProgress} aria-label="Progresso até o próximo nível" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Faltam {missing} XP para o nível {summary.level + 1}.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame
              aria-hidden="true"
              className={
                summary.streakDays > 0
                  ? 'h-6 w-6 text-orange-500'
                  : 'h-6 w-6 text-slate-600 dark:text-slate-400'
              }
            />
            <p className="text-sm">
              <span className="text-lg font-bold">{summary.streakDays}</span>{' '}
              {summary.streakDays === 1 ? 'dia seguido' : 'dias seguidos'} estudando
            </p>
          </div>
          <div className="flex items-center gap-2">
            {earned.slice(0, 4).map((badge) => (
              <span
                key={badge.type}
                title={badge.name}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              >
                <BadgeIcon name={badge.icon} className="h-4 w-4" />
                <span className="sr-only">{badge.name}</span>
              </span>
            ))}
            <Link
              href="/student/conquistas"
              className="ml-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Trophy aria-hidden="true" className="h-4 w-4" />
              {earned.length > 0 ? 'Ver conquistas' : 'Conheça as medalhas'}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
