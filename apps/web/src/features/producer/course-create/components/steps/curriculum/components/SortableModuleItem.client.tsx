'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Module } from '../../../../types'
import type { DragHandleProps } from '../types'

interface SortableModuleItemProps {
  module: Module
  index: number
  children: (props: { dragHandleProps: DragHandleProps }) => React.ReactNode
}

/**
 * Componente wrapper para tornar módulos arrastáveis
 */
export function SortableModuleItem({
  module,
  children,
}: SortableModuleItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}
