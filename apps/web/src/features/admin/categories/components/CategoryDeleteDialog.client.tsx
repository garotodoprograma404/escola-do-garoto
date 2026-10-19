'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { checkCategoryDependenciesAction } from '../actions/check-category-dependencies'
import { deleteCategoryAction } from '../actions/delete-category'
import type { Category } from '../types'

interface CategoryDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onSuccess?: () => void
}

export function CategoryDeleteDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryDeleteDialogProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dependencies, setDependencies] = useState<{
    canDelete: boolean
    hasChildren: boolean
    childrenCount: number
    coursesCount: number
    reasons: string[]
  } | null>(null)

  const checkDependencies = useCallback(async () => {
    if (!category) return

    setIsChecking(true)
    setError(null)

    try {
      const result = await checkCategoryDependenciesAction(category.id)

      if (!result.success || !result.data) {
        setError(result.error || 'Erro ao verificar dependências')
        return
      }

      setDependencies(result.data)
    } catch (err) {
      setError('Erro ao verificar dependências')
      console.error(err)
    } finally {
      setIsChecking(false)
    }
  }, [category])

  // Verificar dependências ao abrir
  useEffect(() => {
    if (open && category) {
      checkDependencies()
    }
  }, [open, category, checkDependencies])

  // Resetar ao fechar
  useEffect(() => {
    if (!open) {
      setError(null)
      setDependencies(null)
    }
  }, [open])

  const handleDelete = async () => {
    if (!category || !dependencies?.canDelete) return

    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteCategoryAction(category.id)

      if (!result.success) {
        setError(result.error || 'Erro ao excluir categoria')
        return
      }

      // Sucesso!
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError('Erro inesperado ao excluir categoria')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!category) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Excluir Categoria
          </AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir a categoria{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              &quot;{category.name}&quot;
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isChecking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                Verificando dependências...
              </span>
            </div>
          ) : dependencies ? (
            <>
              {/* Não pode deletar */}
              {!dependencies.canDelete && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="mb-2 font-semibold">Não é possível excluir esta categoria:</div>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {dependencies.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Pode deletar */}
              {dependencies.canDelete && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="mb-2 font-semibold">Esta ação não pode ser desfeita!</div>
                      <p className="text-sm">
                        A categoria será permanentemente removida do sistema. Todos os dados
                        relacionados serão perdidos.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      <div className="mb-1 font-semibold">Alternativa recomendada:</div>
                      <p className="text-sm">
                        Considere <strong>desativar</strong> a categoria ao invés de excluí-la. Isso
                        mantém o histórico e permite reativá-la no futuro.
                      </p>
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {/* Informações */}
              <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subcategorias:</span>
                  <span className="font-medium">{dependencies.childrenCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Cursos vinculados:</span>
                  <span className="font-medium">{dependencies.coursesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Status:</span>
                  <span
                    className={`font-medium ${
                      dependencies.canDelete ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {dependencies.canDelete ? 'Pode ser excluída' : 'Não pode ser excluída'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isChecking || isDeleting || !dependencies?.canDelete}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Excluindo...' : 'Excluir Categoria'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
