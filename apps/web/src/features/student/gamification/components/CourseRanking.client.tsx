'use client'

import { useEffect, useState, useTransition } from 'react'
import { Medal } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  loadCourseRankingAction,
  setRankingVisibilityAction,
} from '../actions/gamification-actions'
import { rankingMonthLabel } from '../lib/xp-labels'
import type { CourseRanking as CourseRankingData } from '../types'

interface CourseRankingProps {
  courses: { id: number; title: string }[]
  initialRanking: CourseRankingData | null
  rankingVisible: boolean
}

const PODIUM = ['text-amber-500', 'text-slate-400', 'text-orange-700']

/** Ranking do mês por curso (top 10), com a posição do aluno e a opção de sair do ranking. */
export function CourseRanking({ courses, initialRanking, rankingVisible }: CourseRankingProps) {
  const [courseId, setCourseId] = useState(String(initialRanking?.courseId ?? courses[0]?.id ?? ''))
  const [ranking, setRanking] = useState(initialRanking)
  const [visible, setVisible] = useState(rankingVisible)
  const [error, setError] = useState('')
  const [loading, startLoading] = useTransition()
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    if (!courseId || Number(courseId) === ranking?.courseId) return
    startLoading(async () => {
      const result = await loadCourseRankingAction(Number(courseId))
      if (result.success) {
        setRanking(result.ranking)
        setError('')
      } else {
        setError(result.error)
      }
    })
  }, [courseId, ranking?.courseId])

  function toggleVisibility(next: boolean) {
    setVisible(next)
    startSaving(async () => {
      const result = await setRankingVisibilityAction(next)
      if (!result.success) {
        setVisible(!next)
        setError(result.error ?? 'Não foi possível salvar a preferência.')
        return
      }
      const refreshed = await loadCourseRankingAction(Number(courseId))
      if (refreshed.success) setRanking(refreshed.ranking)
    })
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Matricule-se num curso para entrar no ranking.
      </p>
    )
  }

  const meInTop = ranking?.entries.some((entry) => entry.isMe)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full space-y-1.5 sm:max-w-xs">
          <Label htmlFor="ranking-course">Curso</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="ranking-course">
              <SelectValue placeholder="Escolha um curso" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="ranking-visible"
            checked={visible}
            disabled={saving}
            onCheckedChange={toggleVisibility}
          />
          <Label htmlFor="ranking-visible">Aparecer no ranking</Label>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {ranking ? (
        <div aria-busy={loading}>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            Pontos ganhos neste curso em {rankingMonthLabel(ranking.month)}. Todo mês recomeça.
          </p>
          {ranking.entries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Ninguém pontuou neste curso ainda este mês. Conclua uma aula e saia na frente!
            </p>
          ) : (
            <ol className="divide-y rounded-lg border">
              {ranking.entries.map((entry) => (
                <li
                  key={entry.position}
                  className={`flex items-center gap-3 px-4 py-2.5 ${entry.isMe ? 'bg-primary/10 font-semibold' : ''}`}
                >
                  <span className="w-6 text-right tabular-nums">{entry.position}º</span>
                  {entry.position <= 3 ? (
                    <Medal aria-hidden="true" className={`h-4 w-4 ${PODIUM[entry.position - 1]}`} />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                  <span className="flex-1 truncate">
                    {entry.name}
                    {entry.isMe ? ' (você)' : ''}
                  </span>
                  <span className="tabular-nums">{entry.points} XP</span>
                </li>
              ))}
            </ol>
          )}
          {ranking.me && !meInTop ? (
            <p className="mt-3 text-sm">
              Sua posição: <strong>{ranking.me.position}º</strong> com {ranking.me.points} XP.
            </p>
          ) : null}
          {!visible ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Você não aparece no ranking para os outros alunos.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
