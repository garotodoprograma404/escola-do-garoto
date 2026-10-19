// =====================================================
// STUDENT COURSE TABS - CLIENT COMPONENT
// =====================================================

'use client'

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { CourseStatus } from '../types'

interface CourseTabsProps {
  activeTab: CourseStatus
  onTabChange: (tab: CourseStatus) => void
  stats: {
    all: number
    inProgress: number
    completed: number
  }
}

export function CourseTabs({ activeTab, onTabChange, stats }: CourseTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as CourseStatus)}>
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
        <TabsTrigger
          aria-controls={undefined}
          value="all"
          className="min-w-0 gap-1 px-1.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span className="truncate">Todos</span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs">
            {stats.all}
          </span>
        </TabsTrigger>
        <TabsTrigger
          aria-controls={undefined}
          value="in_progress"
          className="min-w-0 gap-1 px-1.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span className="hidden truncate sm:inline">Em Andamento</span>
          <span className="truncate sm:hidden">Andamento</span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs">
            {stats.inProgress}
          </span>
        </TabsTrigger>
        <TabsTrigger
          aria-controls={undefined}
          value="completed"
          className="min-w-0 gap-1 px-1.5 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span className="hidden truncate sm:inline">Concluídos</span>
          <span className="truncate sm:hidden">Concl.</span>
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-xs">
            {stats.completed}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
