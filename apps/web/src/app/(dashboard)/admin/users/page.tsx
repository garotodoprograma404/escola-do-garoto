import { Suspense } from 'react'
import { UserManagementContent } from '@/features/admin/users'

export const metadata = {
  title: 'Gerenciamento de Usuários | Admin',
  description: 'Gerencie todos os usuários da plataforma',
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Gerenciamento de Usuários
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Visualize, edite e gerencie todos os usuários da plataforma
          </p>
        </div>
      </div>

      {/* Content with Suspense */}
      <Suspense fallback={<UserManagementSkeleton />}>
        <UserManagementContent />
      </Suspense>
    </div>
  )
}

function UserManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters Skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
