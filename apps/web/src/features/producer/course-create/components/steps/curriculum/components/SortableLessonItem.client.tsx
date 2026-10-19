'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Lesson } from '../../../../types'
import type { DragHandleProps } from '../types'

interface SortableLessonItemProps {
  lesson: Lesson
  children: (props: { dragHandleProps: DragHandleProps }) => React.ReactNode
}

/**
 * Componente wrapper para tornar aulas arrastáveis
 */
export function SortableLessonItem({
  lesson,
  children,
}: SortableLessonItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
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
