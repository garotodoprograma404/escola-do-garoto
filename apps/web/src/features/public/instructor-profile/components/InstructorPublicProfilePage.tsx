import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { formatCurrency } from '@/shared/lib/utils'
import { Star, Users, BookOpen, Globe, Instagram, Youtube, Linkedin, Facebook } from 'lucide-react'
import type { InstructorPublicProfile } from '../types'

interface InstructorPublicProfilePageProps {
  profile: InstructorPublicProfile
}

const socialConfig = [
  { key: 'website', label: 'Site', icon: Globe },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
] as const

function normalizeExternalLink(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export function InstructorPublicProfilePage({ profile }: InstructorPublicProfilePageProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0">
          {profile.cover_url ? (
            <Image
              src={profile.cover_url}
              alt={profile.name}
              fill
              className="object-cover opacity-35"
              priority
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/65 to-slate-950" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link
            href="/catalog"
            className="mb-6 inline-flex text-sm text-slate-300 transition-colors hover:text-primary"
          >
            ← Voltar para o catálogo
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/40 sm:h-24 sm:w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">{profile.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{profile.name}</h1>
                  <p className="text-sm text-slate-300 sm:text-base">@{profile.slug}</p>
                </div>
              </div>

              {profile.bio ? (
                <p className="max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">
                  {profile.bio}
                </p>
              ) : (
                <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
                  Este instrutor ainda não publicou uma biografia.
                </p>
              )}

              {profile.expertise_areas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.expertise_areas.map((area) => (
                    <Badge
                      key={area}
                      variant="secondary"
                      className="bg-slate-800/90 text-slate-100"
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="border-slate-800 bg-slate-900/80">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Avaliação</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                    <Star className="h-4 w-4 text-primary" />
                    {profile.average_rating ? profile.average_rating.toFixed(1) : 'Sem nota'}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900/80">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Alunos</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                    <Users className="h-4 w-4 text-primary" />
                    {profile.total_students}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900/80">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Cursos</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {profile.total_courses}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {socialConfig.map((item) => {
              const value = profile.social_links[item.key]
              if (!value) return null

              const Icon = item.icon
              return (
                <a
                  key={item.key}
                  href={normalizeExternalLink(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cursos publicados</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Veja todos os cursos ativos deste instrutor.
            </p>
          </div>
        </div>

        {profile.courses.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900">
            <CardContent className="p-6 text-sm text-slate-300">
              Este instrutor ainda não possui cursos publicados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profile.courses.map((course) => {
              const hasDiscount =
                course.discount_price !== null &&
                course.discount_price > 0 &&
                course.discount_price < course.price

              return (
                <Link key={course.id} href={`/courses/${course.slug}`} className="group h-full">
                  <Card className="h-full border-slate-800 bg-slate-900 transition-colors group-hover:border-primary/60">
                    <CardContent className="p-0">
                      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-slate-800">
                        {course.thumbnail_url ? (
                          <Image
                            src={course.thumbnail_url}
                            alt={course.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-900" />
                        )}
                      </div>

                      <div className="space-y-3 p-4">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-100">
                          {course.category_name}
                        </Badge>

                        <h3 className="line-clamp-2 text-base font-semibold text-white">
                          {course.title}
                        </h3>

                        {course.short_description && (
                          <p className="line-clamp-2 text-sm text-slate-300">
                            {course.short_description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>{course.total_students} alunos</span>
                          <span>
                            Atualizado em{' '}
                            {new Date(course.updated_at).toLocaleDateString('pt-BR', {
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="border-t border-slate-800 pt-3">
                          {hasDiscount ? (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                De{' '}
                                <span className="line-through">{formatCurrency(course.price)}</span>
                              </p>
                              <p className="text-xl font-bold text-emerald-400">
                                Por {formatCurrency(course.current_price)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xl font-bold text-white">
                              {formatCurrency(course.current_price)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
