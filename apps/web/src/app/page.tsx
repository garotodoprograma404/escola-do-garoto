// =====================================================
// HOME PAGE - SERVER COMPONENT
// =====================================================

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { HeroSection } from '@/features/public/home/components/HeroSection'
import { DynamicShowcases } from '@/features/public/home/components/DynamicShowcases'
import { getActiveShowcases } from '@/features/public/home/services/bannerService'
import { FeaturedCourses } from '@/features/public/home/components/FeaturedCourses'
import { CTASection } from '@/features/public/home/components/CTASection'
import { AffiliateProgramSection } from '@/features/public/home/components/AffiliateProgramSection'
import { measureOperation } from '@/shared/lib/observability'
import { getFeaturedCourses } from '@/features/public/home'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getPublicGeneralSettings()

  return {
    title: 'Plataforma de Educação Online',
    description:
      generalSettings.platformDescription ||
      'Aprenda com os melhores instrutores do Brasil. Cursos online práticos para você dominar novas habilidades.',
  }
}

async function FeaturedCoursesWrapper() {
  const courses = await measureOperation(
    'route.home.featured-courses',
    () => getFeaturedCourses(6),
    { route: '/' },
  )
  return <FeaturedCourses courses={courses} />
}

async function ShowcasesWrapper() {
  return <DynamicShowcases showcases={await getActiveShowcases()} />
}

export default function HomePage() {
  return (
    <PublicLayout>
      <div className="flex flex-col gap-12 pb-12">
        <Suspense fallback={<Skeleton className="mx-4 mt-4 h-[500px] rounded-3xl" />}>
          <HeroSection />
        </Suspense>

        {/* Featured Courses */}
        <Suspense
          fallback={
            <div className="py-16">
              <div className="mx-auto max-w-7xl px-4">
                <Skeleton className="mx-auto h-8 w-64" />
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-80" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <FeaturedCoursesWrapper />
        </Suspense>

        {/* Vitrines criadas pelo admin */}
        <Suspense fallback={null}>
          <ShowcasesWrapper />
        </Suspense>

        {/* CTA Section */}
        <CTASection />
        <AffiliateProgramSection />
      </div>
    </PublicLayout>
  )
}
