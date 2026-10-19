// =====================================================
// RELATED COURSES - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { formatCurrency } from '@/shared/lib/utils'

interface RelatedCoursesProps {
  courses: {
    id: string
    title: string
    slug: string
    thumbnail_url: string | null
    price: number
    discount_price: number | null
    category_name: string
    producer_name: string
  }[]
}

export function RelatedCourses({ courses }: RelatedCoursesProps) {
  if (!courses || courses.length === 0) {
    return null
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          Cursos Relacionados
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Mais opções da mesma categoria para você continuar estudando
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.slug}`} className="group">
            <Card className="h-full border-slate-200 transition-all duration-300 hover:border-primary/50 hover:shadow-lg dark:border-slate-800">
              <CardContent className="p-0">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute left-2 top-2">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-xs backdrop-blur-sm dark:bg-slate-900/90"
                    >
                      {course.category_name}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 p-4">
                  {/* Title */}
                  <h3 className="line-clamp-2 min-h-[3rem] font-semibold text-slate-900 transition-colors group-hover:text-primary dark:text-white">
                    {course.title}
                  </h3>

                  {/* Producer */}
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {course.producer_name}
                  </p>

                  {/* Price */}
                  <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                    {course.discount_price &&
                    course.discount_price > 0 &&
                    course.discount_price < course.price ? (
                      <div className="flex items-end gap-2">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(course.discount_price)}
                        </span>
                        <span className="text-sm text-slate-600 line-through dark:text-slate-400">
                          {formatCurrency(course.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(course.price)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
