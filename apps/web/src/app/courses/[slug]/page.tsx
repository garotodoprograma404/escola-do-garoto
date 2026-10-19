// =====================================================
// COURSE DETAIL PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { CourseHero } from '@/features/public/course-detail/components/CourseHero'
import { CourseOverview } from '@/features/public/course-detail/components/CourseOverview'
import { WhatYouWillLearn } from '@/features/public/course-detail/components/WhatYouWillLearn'
import { CourseCurriculum } from '@/features/public/course-detail/components/CourseCurriculum'
import { CourseRequirements } from '@/features/public/course-detail/components/CourseRequirements'
import { TargetAudience } from '@/features/public/course-detail/components/TargetAudience'
import { InstructorCard } from '@/features/public/course-detail/components/InstructorCard'
import { RelatedCourses } from '@/features/public/course-detail/components/RelatedCourses'
import { CourseReviews } from '@/features/public/course-detail/components/CourseReviews'
import {
  getCourseBySlug,
  getCourseReviews,
  getRelatedCourses,
  getReviewStats,
} from '@/features/public/course-detail'

interface CoursePageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseBySlug(slug)

  if (!course) {
    return {
      title: 'Curso não encontrado',
    }
  }

  return {
    title: course.title,
    description: course.description,
    alternates: {
      canonical: `/courses/${course.slug}`,
    },
  }
}

async function CourseContent({ slug }: { slug: string }) {
  const course = await getCourseBySlug(slug)

  if (!course) {
    notFound()
  }

  const [relatedCourses, reviews, reviewStats] = await Promise.all([
    getRelatedCourses(course.id, course.category.id, 4),
    getCourseReviews(course.id),
    getReviewStats(course.id),
  ])

  return (
    <>
      <CourseHero course={course} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-4xl space-y-12">
          {/* Sobre o curso */}
          <CourseOverview fullDescription={course.description} />

          {/* O que você vai aprender */}
          <WhatYouWillLearn items={course.what_you_will_learn} />

          {/* Conteúdo do curso */}
          <CourseCurriculum modules={course.modules} />

          {/* Requisitos */}
          <CourseRequirements requirements={course.requirements} />

          {/* Público-alvo */}
          <TargetAudience items={course.target_audience} />

          {/* Instrutor */}
          <InstructorCard instructor={course.producer} category={course.category.name} />

          {/* Avaliações dos alunos */}
          <CourseReviews reviews={reviews} stats={reviewStats} />
        </div>

        {/* Cursos Relacionados - Full Width */}
        {relatedCourses.length > 0 && (
          <div className="mt-16 border-t border-slate-200 pt-12 dark:border-slate-800">
            <RelatedCourses courses={relatedCourses} />
          </div>
        )}
      </div>
    </>
  )
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params

  return (
    <PublicLayout>
      <main className="min-h-screen">
        <Suspense
          fallback={
            <div>
              <Skeleton className="h-96 w-full" />
              <div className="mx-auto max-w-7xl px-4 py-12">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          }
        >
          <CourseContent slug={slug} />
        </Suspense>
      </main>
    </PublicLayout>
  )
}
