// =====================================================
// COURSE GRID - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency } from '@/shared/lib/utils'
import type { CatalogCourse } from '../types'

interface CourseGridProps {
  courses: CatalogCourse[]
}

const levelLabels = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

export function CourseGrid({ courses }: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum curso encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente ajustar os filtros ou buscar por outros termos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const hasDiscount =
          course.discount_price !== null &&
          course.discount_price > 0 &&
          course.discount_price < course.price
        const effectivePrice = hasDiscount ? Number(course.discount_price) : course.price

        return (
          <Link key={course.id} href={`/courses/${course.slug}`} className="group">
            <Card className="h-full overflow-hidden transition-all hover:shadow-lg">
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                {course.thumbnail_url ? (
                  <Image
                    src={course.thumbnail_url}
                    alt={course.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-4xl font-bold text-primary/20">{course.title[0]}</span>
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
                {/* Category & Level */}
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {course.category_name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {levelLabels[course.level as keyof typeof levelLabels] || course.level}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="mb-2 line-clamp-2 font-semibold group-hover:text-primary">
                  {course.title}
                </h3>

                {/* Producer */}
                <p className="mb-3 text-sm text-muted-foreground">{course.producer_name}</p>

                {/* Meta Info */}
                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                  {course.total_lessons > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {course.total_lessons} aulas
                    </div>
                  )}
                  {course.duration_hours > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration_hours}h
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-3">
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
  )
}
