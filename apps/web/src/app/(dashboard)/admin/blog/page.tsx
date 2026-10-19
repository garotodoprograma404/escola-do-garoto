import { Suspense } from 'react'
import { BlogMainTabs } from '@/features/admin/blog/components/BlogMainTabs.client'
import { getBlogPosts } from '@/features/admin/blog/services/blogService'

async function BlogContent() {
  const posts = await getBlogPosts({
    searchTerm: '',
    status: 'ALL',
    categoryId: 'ALL',
    authorId: 'ALL',
  })

  return <BlogMainTabs initialPosts={posts} />
}

function BlogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export default function AdminBlogPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            Gerenciamento de Blog
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Crie e gerencie posts do blog com editor rico e SEO otimizado.
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense fallback={<BlogSkeleton />}>
        <BlogContent />
      </Suspense>
    </div>
  )
}
