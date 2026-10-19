'use client'

import { useState, useCallback, useRef, useTransition, useOptimistic } from 'react'
import { CategoryTreeTable } from '@/features/admin/categories/components/CategoryTreeTable'
import { CategoryEditModal } from '@/features/admin/categories/components/CategoryEditModal.client'
import { CategoryDeleteDialog } from '@/features/admin/categories/components/CategoryDeleteDialog.client'
import { CategoryFilters } from '@/features/admin/categories/components/CategoryFilters.client'
import { getCategoriesAction } from '@/features/admin/categories/actions/get-categories'
import { toggleFeaturedAction } from '@/features/admin/categories/actions/toggle-featured'
import { toggleStatusAction } from '@/features/admin/categories/actions/toggle-status'
import { reorderCategoryAction } from '@/features/admin/categories/actions/reorder-category'
import { useToast } from '@/shared/hooks/use-toast'
import type { Category } from '@/features/admin/categories/types'

type CategoryListFilters = {
  searchTerm: string
  status: 'ALL' | 'active' | 'inactive'
  isFeatured: boolean | null
}

interface CategoriesTableWrapperProps {
  initialCategories: Category[]
}

export function CategoriesTableWrapper({ initialCategories }: CategoriesTableWrapperProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [allCategories] = useState<Category[]>(initialCategories)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Optimistic updates para featured e status
  const [optimisticCategories, setOptimisticCategories] = useOptimistic(
    categories,
    (state, action: { type: 'featured' | 'status'; id: string; value: boolean }) => {
      if (action.type === 'featured') {
        return state.map((cat) =>
          cat.id === action.id ? { ...cat, isFeatured: action.value } : cat,
        ) as Category[]
      }

      if (action.type === 'status') {
        return state.map((cat) =>
          cat.id === action.id ? { ...cat, status: action.value ? 'active' : 'inactive' } : cat,
        ) as Category[]
      }

      return state
    },
  )

  const filtersRef = useRef<CategoryListFilters>({
    searchTerm: '',
    status: 'ALL',
    isFeatured: null,
  })

  const handleFilterChange = useCallback((filters: CategoryListFilters) => {
    filtersRef.current = filters
    startTransition(async () => {
      const result = await getCategoriesAction(filters)
      if (result.success && result.data) {
        setCategories(result.data)
      }
    })
  }, [])

  const handleToggleFeatured = useCallback(
    async (id: string) => {
      const category = categories.find((c) => c.id === id)
      if (!category) return

      const newValue = !category.isFeatured

      // Optimistic update
      startTransition(() => {
        setOptimisticCategories({ type: 'featured', id, value: newValue })
      })

      // Server action
      const result = await toggleFeaturedAction(id)

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error || 'Erro ao atualizar categoria',
        })
        window.location.reload()
        return
      }

      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, isFeatured: newValue } : cat)),
      )

      toast({
        title: 'Sucesso',
        description: newValue
          ? 'Categoria adicionada aos destaques'
          : 'Categoria removida dos destaques',
      })
    },
    [categories, toast, setOptimisticCategories],
  )

  const handleToggleStatus = useCallback(
    async (id: string) => {
      const category = categories.find((c) => c.id === id)
      if (!category) return

      const newValue = category.status === 'inactive'

      // Optimistic update
      startTransition(() => {
        setOptimisticCategories({ type: 'status', id, value: newValue })
      })

      // Server action
      const result = await toggleStatusAction(id)

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error || 'Erro ao atualizar categoria',
        })
        window.location.reload()
        return
      }

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === id ? { ...cat, status: newValue ? 'active' : 'inactive' } : cat,
        ),
      )

      toast({
        title: 'Sucesso',
        description: newValue ? 'Categoria ativada' : 'Categoria desativada',
      })
    },
    [categories, toast, setOptimisticCategories],
  )

  const handleReorder = useCallback(
    async (id: string, direction: 'up' | 'down') => {
      const result = await reorderCategoryAction(id, direction)

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error || 'Erro ao reordenar categoria',
        })
        return
      }

      // A API regrava a ordem de todas as irmãs: recarrega a lista para mostrar a ordem real.
      const refreshed = await getCategoriesAction(filtersRef.current)
      if (refreshed.success && refreshed.data) {
        setCategories(refreshed.data)
      }

      toast({
        title: 'Sucesso',
        description: 'Categoria reordenada com sucesso',
      })
    },
    [toast],
  )

  const handleDelete = (id: string) => {
    const category = categories.find((c) => c.id === id)
    if (category) {
      setDeletingCategory(category)
    }
  }

  return (
    <>
      {/* Filtros */}
      <CategoryFilters
        onFilterChange={handleFilterChange}
        totalCount={allCategories.length}
        filteredCount={categories.length}
      />

      {/* Tabela */}
      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Filtrando...
            </div>
          </div>
        )}
        <CategoryTreeTable
          categories={isPending ? optimisticCategories : categories}
          onEdit={(category) => setEditingCategoryId(category.id)}
          onDelete={handleDelete}
          onToggleFeatured={handleToggleFeatured}
          onToggleStatus={handleToggleStatus}
          onReorder={handleReorder}
        />
      </div>

      {/* Modais */}
      <CategoryEditModal
        open={!!editingCategoryId}
        onOpenChange={(open) => !open && setEditingCategoryId(null)}
        categoryId={editingCategoryId}
        categories={allCategories}
        onSuccess={() => {
          window.location.reload()
        }}
      />

      <CategoryDeleteDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        category={deletingCategory}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </>
  )
}
