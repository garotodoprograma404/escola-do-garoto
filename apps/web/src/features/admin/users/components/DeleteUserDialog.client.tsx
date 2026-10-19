'use client'

import { AlertTriangle } from 'lucide-react'
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
import type { AdminUserListItem } from '../types'

interface DeleteUserDialogProps {
  user: AdminUserListItem | null
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteUserDialog({ user, open, onClose, onConfirm }: DeleteUserDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  if (!user) return null

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-500" />
            </div>
            <AlertDialogTitle>Desativar Usuário</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Tem certeza que deseja desativar o usuário{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span> (
            {user.email})?
            <br />
            <br />
            <span className="font-medium text-red-700 dark:text-red-500">
              O usuário perderá acesso à plataforma até ser reativado.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Sim, Desativar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
