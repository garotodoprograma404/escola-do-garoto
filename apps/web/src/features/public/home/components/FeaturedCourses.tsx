// =====================================================
// FEATURED COURSES - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency } from '@/shared/lib/utils'
import type { FeaturedCourse } from '../types'

interface FeaturedCoursesProps {
  courses: FeaturedCourse[]
}

export function FeaturedCourses({ courses }: FeaturedCoursesProps) {
  if (courses.length === 0) return null

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cursos em Destaque</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Seleção dos cursos mais procurados da plataforma
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => {
            const hasDiscount =
              course.discount_price !== null &&
              course.discount_price > 0 &&
              course.discount_price < course.price
            const effectivePrice = hasDiscount ? Number(course.discount_price) : course.price

            return (
              <Link key={course.id} href={`/courses/${course.slug}`} className="group">
                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  {/* Thumbnail */}
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
                    {/* Rating Badge */}
                    {course.rating > 0 && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {course.rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Category */}
                    <Badge variant="secondary" className="mb-2">
                      {course.category_name}
                    </Badge>

                    {/* Title */}
                    <h3 className="mb-2 line-clamp-2 font-semibold group-hover:text-primary">
                      {course.title}
                    </h3>

                    {/* Producer */}
                    <p className="mb-3 text-sm text-muted-foreground">{course.producer_name}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col leading-tight">
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground">
                            De <span className="line-through">{formatCurrency(course.price)}</span>
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

        {/* View All */}
        <div className="mt-12 text-center">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Ver o restante
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
