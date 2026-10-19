'use client'

import { Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'

interface ReviewSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  onEdit?: () => void
  collapsible?: boolean
  defaultExpanded?: boolean
}

/**
 * Componente wrapper para cada seção da revisão
 * Inclui título, ícone, botão de editar e opção de colapsar
 */
export function ReviewSection({
  title,
  icon,
  children,
  onEdit,
  collapsible = false,
  defaultExpanded = true,
}: ReviewSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button type="button" variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}

            {collapsible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
                aria-label={isExpanded ? `Recolher seção ${title}` : `Expandir seção ${title}`}
                title={isExpanded ? `Recolher seção ${title}` : `Expandir seção ${title}`}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  )
}
