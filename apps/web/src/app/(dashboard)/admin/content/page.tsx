import { Suspense } from 'react'
import { ContentManagementClient } from '@/features/admin/content/components/ContentManagement.client'
import { getBanners, getShowcases } from '@/features/admin/content/services/contentService'

async function ContentData() {
  const [banners, showcases] = await Promise.all([
    getBanners({ searchTerm: '', status: 'ALL' }),
    getShowcases(),
  ])

  return <ContentManagementClient initialBanners={banners} initialShowcases={showcases} />
}

function ContentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  )
}

export default function AdminContentPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            Gestão de Conteúdo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie campanhas, banners inteligentes e vitrines da home.
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<ContentSkeleton />}>
        <ContentData />
      </Suspense>
    </div>
  )
}
