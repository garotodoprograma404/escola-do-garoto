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

interface DeleteLessonDialogProps {
  deleteLessonId: { moduleId: string; lessonId: string } | null
  onConfirm: (moduleId: string, lessonId: string) => void
  onCancel: () => void
}

/**
 * Diálogo de confirmação para deletar aula
 */
export function DeleteLessonDialog({
  deleteLessonId,
  onConfirm,
  onCancel,
}: DeleteLessonDialogProps) {
  return (
    <AlertDialog open={deleteLessonId !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Aula?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A aula será removida permanentemente do módulo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              deleteLessonId && onConfirm(deleteLessonId.moduleId, deleteLessonId.lessonId)
            }
            className="bg-red-600 hover:bg-red-700"
          >
            Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
