// =====================================================
// PRODUCER Q&A - PAGE
// =====================================================

import { redirect } from 'next/navigation'
import { getProducerCourseOptions } from '@/features/producer/services/courseOptionsService'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  getProducerQuestions,
  StatsCards,
  QnAFilters,
  QuestionsList,
} from '@/features/producer/qna'
import type { QuestionFilter } from '@/features/producer/qna'

interface PageProps {
  searchParams: Promise<{
    courseId?: string
    filter?: string
  }>
}

export default async function ProducerQnAPage({ searchParams }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/dashboard')
  }

  // Get search params
  const params = await searchParams
  const courseId = params.courseId
  const filter = (params.filter as QuestionFilter) || 'all'

  // Fetch producer's courses for filter
  const coursesForFilter = await getProducerCourseOptions()

  // Fetch Q&A data
  const qnaData = await getProducerQuestions(authContext.userId, courseId, filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Perguntas & Respostas</h1>
          <p className="text-muted-foreground">Responda as dúvidas dos seus alunos</p>
        </div>
        <QnAFilters courses={coursesForFilter} />
      </div>

      {/* Stats Cards */}
      <StatsCards stats={qnaData.stats} />

      {/* Questions List */}
      <QuestionsList questions={qnaData.questions} />
    </div>
  )
}
