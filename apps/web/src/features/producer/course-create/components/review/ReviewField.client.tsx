'use client'

import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ReviewFieldProps {
  label: string
  value: React.ReactNode
  isEmpty?: boolean
  isOptional?: boolean
  fullWidth?: boolean
}

/**
 * Componente para mostrar campo individual na revisão
 * Exibe label + valor com indicadores visuais de preenchimento
 */
export function ReviewField({
  label,
  value,
  isEmpty = false,
  isOptional = false,
  fullWidth = false,
}: ReviewFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-full' : ''}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <dt className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
          {isOptional && (
            <span className="text-xs text-slate-400 dark:text-slate-500">(opcional)</span>
          )}
        </dt>

        {!isEmpty && !isOptional && (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-700 dark:text-green-400" />
        )}

        {isEmpty && isOptional && (
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
        )}
      </div>

      <dd className="text-sm text-slate-900 dark:text-white">
        {isEmpty ? (
          <span className="italic text-slate-400 dark:text-slate-500">Não preenchido</span>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
