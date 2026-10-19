'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import type { Module } from '../../../../types'

interface DeleteModuleDialogProps {
  moduleId: string | null
  modules: Module[]
  onConfirm: (moduleId: string) => void
  onCancel: () => void
}

/**
 * Diálogo de confirmação para deletar módulo
 */
export function DeleteModuleDialog({
  moduleId,
  modules,
  onConfirm,
  onCancel,
}: DeleteModuleDialogProps) {
  const selectedModule = moduleId ? modules.find((m) => m.id === moduleId) : null
  const hasLessons = selectedModule && selectedModule.lessons.length > 0

  return (
    <AlertDialog open={moduleId !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Módulo?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasLessons && (
              <span className="font-medium text-orange-700 dark:text-orange-400">
                Este módulo contém aulas que também serão deletadas.{' '}
              </span>
            )}
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => moduleId && onConfirm(moduleId)}
            className="bg-red-600 hover:bg-red-700"
          >
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
