import { Suspense } from 'react'
import { getCategories } from '@/features/admin/categories/services/categoryService'
import { CreateCategoryButton } from './CreateCategoryButton.client'
import { CategoriesTableWrapper } from './CategoriesTableWrapper.client'

async function CategoriesContent() {
  const categories = await getCategories({
    searchTerm: '',
    status: 'ALL',
  })

  return <CategoriesTableWrapper initialCategories={categories} />
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default async function AdminCategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <Suspense
        fallback={<div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />}
      >
        <CategoriesHeader />
      </Suspense>

      {/* Content */}
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </div>
  )
}

async function CategoriesHeader() {
  const categories = await getCategories({
    searchTerm: '',
    status: 'ALL',
  })

  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Categorias</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Organize a hierarquia e taxonomia da plataforma.
        </p>
      </div>
      <CreateCategoryButton categories={categories} />
    </div>
  )
}
