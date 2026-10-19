import { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface StatCardProps {
  title: string
  value: string
  change?: string
  icon: LucideIcon
  positive?: boolean
  variant?: 'default' | 'warning'
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive = true,
  variant = 'default',
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6 shadow-sm transition-all',
        variant === 'default' &&
          'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        variant === 'warning' &&
          'border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10',
        onClick && 'cursor-pointer hover:shadow-md',
      )}
      onClick={onClick}
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn(
            'rounded-lg p-2',
            variant === 'default' &&
              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            variant === 'warning' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}
        >
          <Icon size={20} />
        </div>
        {change && (
          <span
            className={cn(
              'rounded-full px-2 py-1 text-xs font-bold',
              positive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              variant === 'warning' && 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p
        className={cn(
          'mb-1 text-sm font-medium',
          variant === 'default' && 'text-slate-600 dark:text-slate-400',
          variant === 'warning' && 'text-red-700 dark:text-red-400',
        )}
      >
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
    </div>
  )
}
