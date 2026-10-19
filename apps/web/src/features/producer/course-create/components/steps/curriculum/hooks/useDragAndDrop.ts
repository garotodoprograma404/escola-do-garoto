import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { closestCenter } from '@dnd-kit/core'
import type { Module } from '../../../../types'

interface UseDragAndDropProps {
  modules: Module[]
  setModules: (modules: Module[]) => void
}

/**
 * Hook para gerenciar drag & drop de módulos e aulas
 */
export function useDragAndDrop({ modules, setModules }: UseDragAndDropProps) {
  // Configurar sensores otimizados
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de iniciar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  /**
   * Handler para fim do drag
   */
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeModuleIndex = modules.findIndex((module) => module.id === activeId)
    const overModuleIndex = modules.findIndex((module) => module.id === overId)

    // Drag de módulo
    if (activeModuleIndex !== -1 && overModuleIndex !== -1) {
      const reorderedModules = arrayMove(modules, activeModuleIndex, overModuleIndex)
      setModules(
        reorderedModules.map((module, index) => ({
          ...module,
          order: index,
        })),
      )
      return
    }

    const sourceModuleIndex = modules.findIndex((module) =>
      module.lessons.some((lesson) => lesson.id === activeId),
    )
    const targetModuleIndex = modules.findIndex((module) =>
      module.lessons.some((lesson) => lesson.id === overId),
    )

    // Drag de aula (mesmo módulo)
    if (sourceModuleIndex === -1 || sourceModuleIndex !== targetModuleIndex) return

    const sourceModule = modules[sourceModuleIndex]
    if (!sourceModule) return

    const activeLessonIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === activeId)
    const overLessonIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === overId)

    if (activeLessonIndex === -1 || overLessonIndex === -1) return

    const reorderedLessons = arrayMove(sourceModule.lessons, activeLessonIndex, overLessonIndex)

    setModules(
      modules.map((module, moduleIndex) => {
        if (moduleIndex !== sourceModuleIndex) return module

        return {
          ...module,
          lessons: reorderedLessons.map((lesson, index) => ({
            ...lesson,
            order: index,
          })),
        }
      }),
    )
  }

  return {
    sensors,
    collisionDetection: closestCenter,
    onDragEnd: handleDragEnd,
  }
}
