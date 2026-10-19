'use client'

import { FileText, Edit, CheckCircle, Archive } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { PostStatus } from '../types'

interface BlogStatusTabsProps {
  activeStatus: PostStatus | 'ALL'
  onStatusChange: (status: PostStatus | 'ALL') => void
  counts: {
    all: number
    draft: number
    published: number
    archived: number
  }
}

export function BlogStatusTabs({ activeStatus, onStatusChange, counts }: BlogStatusTabsProps) {
  return (
    <Tabs
      value={activeStatus}
      onValueChange={(value) => onStatusChange(value as PostStatus | 'ALL')}
    >
      <TabsList className="grid w-full grid-cols-4 lg:w-auto">
        <TabsTrigger aria-controls={undefined} value="ALL" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Todos</span>
          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-700">
            {counts.all}
          </span>
        </TabsTrigger>

        <TabsTrigger aria-controls={undefined} value="draft" className="gap-2">
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Rascunhos</span>
          <span className="ml-1 rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium dark:bg-yellow-900">
            {counts.draft}
          </span>
        </TabsTrigger>

        <TabsTrigger aria-controls={undefined} value="published" className="gap-2">
          <CheckCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Publicados</span>
          <span className="ml-1 rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium dark:bg-green-900">
            {counts.published}
          </span>
        </TabsTrigger>

        <TabsTrigger aria-controls={undefined} value="archived" className="gap-2">
          <Archive className="h-4 w-4" />
          <span className="hidden sm:inline">Arquivados</span>
          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-700">
            {counts.archived}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
