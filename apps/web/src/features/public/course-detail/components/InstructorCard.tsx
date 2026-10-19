// =====================================================
// INSTRUCTOR CARD - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'

interface InstructorCardProps {
  instructor: {
    id: string
    name: string
    slug: string | null
    public_profile_enabled: boolean
    avatar: string | null
    bio: string | null
    expertise_areas: string[]
    total_courses: number
  }
  category: string
}

export function InstructorCard({ instructor, category }: InstructorCardProps) {
  const normalizedCategory = category.toLowerCase()
  const hasAlignedExpertise = instructor.expertise_areas.some((area) => {
    const normalizedArea = area.toLowerCase()
    return (
      normalizedCategory.includes(normalizedArea) || normalizedArea.includes(normalizedCategory)
    )
  })

  const shouldShowBio = Boolean(
    instructor.bio && (instructor.expertise_areas.length === 0 || hasAlignedExpertise),
  )
  const instructorProfileUrl =
    instructor.public_profile_enabled && instructor.slug ? `/instrutor/${instructor.slug}` : null

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Seu Instrutor</h2>
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Avatar e Stats */}
            <div className="shrink-0 text-center sm:text-left">
              <Avatar className="mx-auto mb-3 h-24 w-24 border-4 border-primary/10 sm:mx-0">
                <AvatarImage src={instructor.avatar || undefined} />
                <AvatarFallback className="text-2xl">{instructor.name[0]}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1 text-xs text-slate-600 dark:text-slate-400 sm:justify-start">
                  <BookOpen className="h-3 w-3" />
                  <span>{instructor.total_courses} cursos publicados</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
                {instructorProfileUrl ? (
                  <Link
                    href={instructorProfileUrl}
                    className="underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {instructor.name}
                  </Link>
                ) : (
                  instructor.name
                )}
              </h3>
              <p className="mb-4 text-sm font-medium text-primary">Instrutor de {category}</p>

              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {shouldShowBio
                  ? instructor.bio
                  : 'Perfil público do instrutor em atualização para esta categoria.'}
              </p>

              {instructorProfileUrl && (
                <Link
                  href={instructorProfileUrl}
                  className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
                >
                  Ver perfil público do instrutor
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
