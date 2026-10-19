'use client'

import { Edit, Trash2, MoveUp, MoveDown } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import type { Showcase } from '../types'

interface ShowcaseListProps {
  showcases: Showcase[]
  onEdit: (showcase: Showcase) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

export function ShowcaseList({ showcases, onEdit, onDelete, onMove }: ShowcaseListProps) {
  if (showcases.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhuma vitrine encontrada. Crie a primeira vitrine.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showcases.map((showcase, index) => (
        <div
          key={showcase.id}
          className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-500/50 dark:border-slate-800 dark:bg-slate-900 md:flex-row"
        >
          <div className="mr-2 flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(showcase.id, 'up')}
              disabled={index === 0}
              className="h-8 w-8"
            >
              <MoveUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMove(showcase.id, 'down')}
              disabled={index === showcases.length - 1}
              className="h-8 w-8"
            >
              <MoveDown size={16} />
            </Button>
          </div>

          <div className="w-full flex-1 text-center md:text-left">
            <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900 dark:text-white md:justify-start">
              {showcase.title}
              {!showcase.active && (
                <Badge variant="secondary" className="text-xs">
                  Inativa
                </Badge>
              )}
            </h3>
            <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
              {showcase.description || 'Sem descrição'}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs md:justify-start">
              {showcase.type === 'dynamic' ? (
                <Badge className="border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900 dark:bg-purple-900/30 dark:text-purple-300">
                  Dinâmica:{' '}
                  {showcase.dynamicRule === 'bestsellers'
                    ? 'Mais Vendidos'
                    : showcase.dynamicRule === 'newest'
                      ? 'Lançamentos'
                      : 'Melhor Avaliados'}{' '}
                  (Max {showcase.limit})
                </Badge>
              ) : (
                <Badge className="border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300">
                  Manual: {showcase.courseIds.length} cursos
                </Badge>
              )}
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 md:w-auto md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(showcase)}
              aria-label={`Editar vitrine ${showcase.title}`}
            >
              <Edit size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(showcase.id)}
              aria-label={`Excluir vitrine ${showcase.title}`}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
