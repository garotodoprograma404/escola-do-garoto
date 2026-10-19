// =====================================================
// PRODUCER ACADEMY - PAGE
// =====================================================

import { redirect } from 'next/navigation'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  StatsCards,
  AcademyFilters,
  ContentGrid,
  getAcademyContent,
  type CategoryFilter,
  type DifficultyFilter,
} from '@/features/producer/academy'

interface PageProps {
  searchParams: Promise<{ category?: string; difficulty?: string }>
}

export default async function ProducerAcademyPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/dashboard')
  }

  // Get search params
  const params = await searchParams
  const categoryFilter = (params.category as CategoryFilter) || 'all'
  const difficultyFilter = (params.difficulty as DifficultyFilter) || 'all'

  // Fetch data
  const { stats, contents } = await getAcademyContent(
    authContext.userId,
    categoryFilter,
    difficultyFilter,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Academia do Produtor</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Aprenda a criar e vender cursos de sucesso
        </p>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <AcademyFilters />
      </div>

      {/* Content Grid */}
      <ContentGrid contents={contents} />
    </div>
  )
}
