// =====================================================
// DYNAMIC SHOWCASES - SERVER COMPONENT
// =====================================================

import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { unstable_cache } from 'next/cache'
import { apiGetPublic } from '@/lib/api'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { formatCurrency } from '@/shared/lib/utils'
import type { FeaturedCourse, Showcase } from '../types'

interface DynamicShowcasesProps {
  showcases: Showcase[]
}

/** Curso de uma vitrine como a API pública entrega (nomes de categoria e instrutor já resolvidos). */
interface ShowcaseCourseRow {
  id: string | number
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  price: number | string | null
  discount_price: number | string | null
  average_rating: number | string | null
  total_students: number | null
  category_name: string | null
  producer_name: string | null
  producer_avatar: string | null
}

interface ShowcaseCoursesResult {
  showcase_id: number
  courses: ShowcaseCourseRow[]
}

/**
 * Todas as vitrines ativas já com os cursos (a API aplica a regra de cada uma: escolhidos na ordem
 * escolhida, ou mais vendidos / mais bem avaliados / mais novos). Só cursos publicados e aprovados.
 */
const getShowcaseCoursesCached = unstable_cache(
  async () => (await apiGetPublic<ShowcaseCoursesResult[]>('/public/showcases/courses')) ?? [],
  ['home-showcase-courses-v1'],
  { revalidate: 120, tags: ['home-public', 'home-showcases'] },
)

function mapToFeaturedCourse(course: ShowcaseCourseRow): FeaturedCourse {
  return {
    id: String(course.id),
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    thumbnail_url: course.thumbnail_url,
    price: Number(course.price) || 0,
    discount_price: course.discount_price !== null ? Number(course.discount_price) : null,
    rating: Number(course.average_rating) || 0,
    total_students: course.total_students || 0,
    category_name: course.category_name || 'Geral',
    producer_name: course.producer_name || 'Instrutor',
    producer_avatar: course.producer_avatar || null,
  }
}

export async function DynamicShowcases({ showcases }: DynamicShowcasesProps) {
  if (showcases.length === 0) {
    return null
  }

  let showcaseCourses: ShowcaseCoursesResult[] = []
  try {
    showcaseCourses = await getShowcaseCoursesCached()
  } catch (error) {
    console.error('Error fetching showcase courses:', error)
    return null
  }

  const coursesByShowcase = new Map<string, FeaturedCourse[]>(
    showcaseCourses.map((entry) => [
      String(entry.showcase_id),
      entry.courses.map(mapToFeaturedCourse),
    ]),
  )

  if ([...coursesByShowcase.values()].every((courses) => courses.length === 0)) {
    return null
  }

  return (
    <>
      {showcases.map((showcase) => {
        const courses = coursesByShowcase.get(showcase.id) ?? []
        if (courses.length === 0) {
          return null
        }

        return (
          <section key={showcase.id} className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="mb-1 text-3xl font-bold">{showcase.title}</h2>
                {showcase.description && (
                  <p className="text-muted-foreground">{showcase.description}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map((course) => {
                const hasDiscount =
                  course.discount_price !== null &&
                  course.discount_price > 0 &&
                  course.discount_price < course.price
                const effectivePrice = hasDiscount ? Number(course.discount_price) : course.price

                return (
                  <Link key={course.id} href={`/courses/${course.slug}`} className="group">
                    <Card className="overflow-hidden transition-all hover:shadow-lg">
                      <div className="relative aspect-video overflow-hidden bg-muted">
                        {course.thumbnail_url ? (
                          <Image
                            src={course.thumbnail_url}
                            alt={course.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-4xl font-bold text-primary/20">
                              {course.title[0]}
                            </span>
                          </div>
                        )}
                        {course.rating > 0 && (
                          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {course.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      <CardContent className="p-4">
                        <Badge variant="secondary" className="mb-2">
                          {course.category_name}
                        </Badge>
                        <h3 className="mb-2 line-clamp-2 font-semibold group-hover:text-primary">
                          {course.title}
                        </h3>
                        <p className="mb-3 text-sm text-muted-foreground">{course.producer_name}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-col leading-tight">
                            {hasDiscount && (
                              <span className="text-xs text-muted-foreground">
                                De{' '}
                                <span className="line-through">{formatCurrency(course.price)}</span>
                              </span>
                            )}
                            <span
                              className={`text-lg font-bold ${hasDiscount ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                            >
                              {effectivePrice === 0
                                ? 'Gratuito'
                                : `${hasDiscount ? 'Por ' : ''}${formatCurrency(effectivePrice)}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
