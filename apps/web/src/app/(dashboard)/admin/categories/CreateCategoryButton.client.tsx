'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { CategoryCreateModal } from '@/features/admin/categories/components/CategoryCreateModal.client'
import type { Category } from '@/features/admin/categories/types'

interface CreateCategoryButtonProps {
  categories: Category[]
}

export function CreateCategoryButton({ categories }: CreateCategoryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-brand-500 text-black hover:bg-brand-400"
      >
        <Plus size={18} className="mr-2" />
        Nova Categoria
      </Button>

      <CategoryCreateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={categories}
        onSuccess={() => {
          // Recarregar página após sucesso
          window.location.reload()
        }}
      />
    </>
  )
}
