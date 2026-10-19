import { Suspense } from 'react'
import { AffiliatesManagement, getAffiliateAdminDashboardData } from '@/features/admin/affiliates'

export const metadata = {
  title: 'Afiliados | Admin',
  description: 'Gerencie afiliados, parcerias e vendas atribuídas na plataforma',
}

async function AffiliatesContent() {
  const data = await getAffiliateAdminDashboardData()
  return <AffiliatesManagement initialData={data} />
}

function AffiliatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function AdminAffiliatesPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<AffiliatesSkeleton />}>
        <AffiliatesContent />
      </Suspense>
    </div>
  )
}
