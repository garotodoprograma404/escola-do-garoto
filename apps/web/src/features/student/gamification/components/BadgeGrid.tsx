import { Lock } from 'lucide-react'
import type { GamificationBadge } from '../types'
import { BadgeIcon } from './BadgeIcon'

/** Todas as medalhas: as ganhas coloridas (com a data) e as bloqueadas dizendo como ganhar. */
export function BadgeGrid({ badges }: { badges: GamificationBadge[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => {
        const earned = Boolean(badge.earnedAt)
        return (
          <li
            key={badge.type}
            className={`flex items-start gap-3 rounded-lg border p-4 ${earned ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40' : 'border-dashed'}`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${earned ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-muted text-muted-foreground'}`}
            >
              {earned ? (
                <BadgeIcon name={badge.icon} className="h-5 w-5" />
              ) : (
                <Lock aria-hidden="true" className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{badge.description}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {earned
                  ? `Conquistada em ${new Date(badge.earnedAt!).toLocaleDateString('pt-BR')}`
                  : 'Ainda não conquistada'}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
