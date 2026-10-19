'use client'

import { Activity, AlertCircle, CheckCircle, Clock3 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import type { RecentActivity } from '../types'

interface RecentActivityTableProps {
  activities: RecentActivity[]
}

function formatTimestamp(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 60) {
    return `Há ${diffMins} min`
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return `Há ${diffHours}h`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `Há ${diffDays}d`
}

function getStatusBadge(activity: RecentActivity) {
  if (activity.status === 'completed') {
    return {
      label: 'Concluído',
      icon: CheckCircle,
      className:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900',
    }
  }

  if (activity.status === 'pending') {
    return {
      label: 'Pendente',
      icon: Clock3,
      className:
        'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    }
  }

  return {
    label: 'Falhou',
    icon: AlertCircle,
    className:
      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900',
  }
}

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-800">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Activity size={20} className="text-slate-600 dark:text-slate-400" /> Atividade Recente
        </h3>
        <button className="text-sm font-bold text-brand-600 hover:underline dark:text-brand-400">
          Ver tudo
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Ação</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm text-slate-600 dark:text-slate-400"
                >
                  Nenhuma atividade recente encontrada.
                </td>
              </tr>
            ) : (
              activities.map((activity) => {
                const badge = getStatusBadge(activity)
                const StatusIcon = badge.icon

                return (
                  <tr
                    key={activity.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-200 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {activity.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {activity.user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {activity.action}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1 ${badge.className}`}
                      >
                        <StatusIcon size={10} /> {badge.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-500">
                      {formatTimestamp(activity.timestamp)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
