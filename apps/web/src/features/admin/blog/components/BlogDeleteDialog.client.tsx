'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Archive } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'

interface BlogDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postTitle: string
  postId: string
  onConfirm: (postId: string) => Promise<void>
}

export function BlogDeleteDialog({
  open,
  onOpenChange,
  postTitle,
  postId,
  onConfirm,
}: BlogDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm(postId)
      onOpenChange(false)
    } catch {
      // Error handling is done in parent component
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle size={20} />
            Confirmar Exclusão
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Você está prestes a excluir o post:{' '}
              <strong className="text-slate-900 dark:text-white">{postTitle}</strong>
            </p>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Esta ação é permanente e não pode ser desfeita. Todos os
                dados do post serão perdidos.
              </AlertDescription>
            </Alert>

            <Alert>
              <Archive className="h-4 w-4" />
              <AlertDescription>
                <strong>Sugestão:</strong> Considere arquivar o post ao invés de excluí-lo. Posts
                arquivados podem ser restaurados posteriormente.
              </AlertDescription>
            </Alert>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir Permanentemente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
