import { xpSourceLabel } from '../lib/xp-labels'
import type { GamificationSummary } from '../types'

/** Últimos pontos ganhos. */
export function XpHistory({ events }: { events: GamificationSummary['recentEvents'] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Você ainda não ganhou pontos. Conclua uma aula para começar!
      </p>
    )
  }
  return (
    <ul className="divide-y rounded-lg border">
      {events.map((event, index) => (
        <li key={`${event.createdAt}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{xpSourceLabel(event.source)}</p>
            <p className="truncate text-sm text-slate-600 dark:text-slate-400">
              {event.courseTitle ? `${event.courseTitle} · ` : ''}
              {new Date(event.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span className="font-semibold text-green-700 dark:text-green-400">
            +{event.points} XP
          </span>
        </li>
      ))}
    </ul>
  )
}
