// =====================================================
// PRODUCER REVIEWS - PAGE
// =====================================================

import { redirect } from 'next/navigation'
import { getProducerCourseOptions } from '@/features/producer/services/courseOptionsService'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  getProducerReviews,
  ReviewStatsCards,
  ReviewFilters,
  ReviewsList,
} from '@/features/producer/reviews'
import type { ReviewFilter } from '@/features/producer/reviews'

interface PageProps {
  searchParams: Promise<{
    courseId?: string
    filter?: string
  }>
}

export default async function ProducerReviewsPage({ searchParams }: PageProps) {
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
  const filter = (params.filter as ReviewFilter) || 'all'

  // Fetch producer's courses for filter
  const coursesForFilter = await getProducerCourseOptions()

  // Fetch reviews data
  const reviewsData = await getProducerReviews(authContext.userId, courseId, filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">
            Veja o que seus alunos estão dizendo sobre seus cursos
          </p>
        </div>
        <ReviewFilters courses={coursesForFilter} />
      </div>

      {/* Stats Cards */}
      <ReviewStatsCards stats={reviewsData.stats} />

      {/* Reviews List */}
      <ReviewsList reviews={reviewsData.reviews} />
    </div>
  )
}
