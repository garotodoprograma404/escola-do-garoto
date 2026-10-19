'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface ListPreviewProps {
  items: string[]
  label: string
  icon?: React.ReactNode
  emptyMessage?: string
  maxVisibleItems?: number
}

/**
 * Componente para preview de listas (what_you_will_learn, requirements, etc)
 * Mostra os primeiros N itens e permite expandir para ver todos
 */
export function ListPreview({
  items,
  label,
  icon,
  emptyMessage = 'Nenhum item adicionado',
  maxVisibleItems = 5,
}: ListPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!items || items.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  const hasMore = items.length > maxVisibleItems
  const visibleItems = isExpanded ? items : items.slice(0, maxVisibleItems)
  const hiddenCount = items.length - maxVisibleItems

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-900 dark:border-slate-800 dark:bg-slate-950">
        {visibleItems.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <div className="mt-0.5 flex-shrink-0">
              {icon || <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />}
            </div>
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item}</p>
          </div>
        ))}

        {hasMore && (
          <div className="p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Ver mais {hiddenCount} {hiddenCount === 1 ? 'item' : 'itens'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
