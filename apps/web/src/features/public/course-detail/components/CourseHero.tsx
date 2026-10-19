// =====================================================
// COURSE HERO - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Award, Globe, Heart, Share2, FileText } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Card, CardContent } from '@/shared/components/ui/card'
import { formatCurrency } from '@/shared/lib/utils'
import type { CourseDetail } from '../types'
import { AddToCartButton } from './AddToCartButton.client'
import { BuyNowButton } from './BuyNowButton.client'
import { CoursePreviewTrigger } from './CoursePreviewTrigger.client'

interface CourseHeroProps {
  course: CourseDetail
  isPreview?: boolean
}

const levelLabels = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'Carga horária em atualização'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}min de conteúdo`
  if (minutes === 0) return `${hours}h de conteúdo`
  return `${hours}h ${minutes}min de conteúdo`
}

export function CourseHero({ course, isPreview = false }: CourseHeroProps) {
  const discountedPrice = course.discount_price
  const hasDiscount =
    discountedPrice !== null && discountedPrice > 0 && discountedPrice < course.price

  const currentPrice = hasDiscount && discountedPrice !== null ? discountedPrice : course.price
  const discountPercentage =
    hasDiscount && course.price > 0
      ? Math.round(((course.price - currentPrice) / course.price) * 100)
      : 0

  const updatedDate = new Date(course.updated_at).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  })

  const description =
    course.short_description && course.short_description.trim().length > 0
      ? course.short_description
      : course.description

  const previewUrl =
    typeof course.trailer_url === 'string' && course.trailer_url.trim().length > 0
      ? course.trailer_url.trim()
      : null
  const previewTitle = `Preview: ${course.title}`
  const instructorProfileUrl =
    course.producer.public_profile_enabled && course.producer.slug
      ? `/instrutor/${course.producer.slug}`
      : null

  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black via-black/90 to-transparent" />
        {course.cover_image_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('${course.cover_image_url}')`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )}
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Breadcrumb */}
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-white dark:text-slate-400"
            >
              ← Voltar para o catálogo
            </Link>

            {/* Category Badge & Update Date */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <Badge className="border border-primary/30 bg-primary/20 uppercase tracking-wider text-primary hover:bg-primary/30">
                {course.category.name}
              </Badge>
              <span className="text-slate-600 dark:text-slate-400">•</span>
              <span className="text-slate-300">Atualizado em {updatedDate}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl xl:text-5xl">
              {course.title}
            </h1>

            {/* Description */}
            <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {description}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:gap-6 sm:text-sm">
              <div className="flex items-center gap-1 text-slate-300">
                <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Português</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {levelLabels[course.level as keyof typeof levelLabels] || course.level}
              </Badge>
            </div>

            {/* Producer */}
            <div className="flex items-center gap-3 pt-2">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarImage src={course.producer.avatar || undefined} />
                <AvatarFallback>{course.producer.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">Criado por</p>
                {instructorProfileUrl ? (
                  <Link
                    href={instructorProfileUrl}
                    className="text-sm font-semibold underline-offset-4 transition-colors hover:text-primary hover:underline sm:text-base"
                  >
                    {course.producer.name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold sm:text-base">{course.producer.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Card */}
          <div className="lg:col-span-1">
            <Card className="border-slate-800 bg-white shadow-2xl dark:bg-slate-900 lg:sticky lg:top-24">
              <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
                {/* Video Preview */}
                {previewUrl ? (
                  <CoursePreviewTrigger
                    courseTitle={course.title}
                    thumbnailUrl={course.thumbnail_url}
                    previewTitle={previewTitle}
                    previewUrl={previewUrl}
                    previewText={null}
                  />
                ) : (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
                    {course.thumbnail_url ? (
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        className="object-cover opacity-90"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-900" />
                    )}
                  </div>
                )}

                {/* Price */}
                <div>
                  <div className="mb-1">
                    {currentPrice === 0 ? (
                      <span className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                        Gratuito
                      </span>
                    ) : hasDiscount ? (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                          De <span className="line-through">{formatCurrency(course.price)}</span>
                        </p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 sm:text-3xl">
                          Por {formatCurrency(currentPrice)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                        {formatCurrency(currentPrice)}
                      </span>
                    )}
                  </div>

                  {hasDiscount ? (
                    <p className="inline-block rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400 sm:text-sm">
                      {discountPercentage}% OFF
                    </p>
                  ) : currentPrice > 0 ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                      Pagamento único
                    </p>
                  ) : null}
                </div>

                {/* CTA Buttons */}
                {!isPreview ? (
                  <div className="space-y-2 sm:space-y-3">
                    <BuyNowButton
                      courseId={String(course.id)}
                      courseTitle={course.title}
                      courseSlug={course.slug}
                      coursePrice={currentPrice}
                      courseThumbnail={course.thumbnail_url}
                      producerName={course.producer.name}
                    />
                    <AddToCartButton
                      courseId={String(course.id)}
                      courseTitle={course.title}
                      courseSlug={course.slug}
                      coursePrice={currentPrice}
                      courseThumbnail={course.thumbnail_url}
                      producerName={course.producer.name}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/20">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Modo Preview - Auditoria
                    </p>
                  </div>
                )}

                {/* Guarantee */}
                <p className="text-center text-xs text-slate-600 dark:text-slate-400">
                  Garantia de 7 dias ou seu dinheiro de volta.
                </p>

                {/* Features */}
                <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800 sm:space-y-4 sm:pt-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                    Este curso inclui:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                    <li className="flex items-center gap-2 sm:gap-3">
                      <Clock className="h-3 w-3 shrink-0 text-primary sm:h-4 sm:w-4" />
                      <span>{formatDuration(course.total_duration_minutes)}</span>
                    </li>
                    <li className="flex items-center gap-2 sm:gap-3">
                      <FileText className="h-3 w-3 shrink-0 text-primary sm:h-4 sm:w-4" />
                      <span>{course.total_lessons} aulas e recursos</span>
                    </li>
                    {course.has_lifetime_access && (
                      <li className="flex items-center gap-2 sm:gap-3">
                        <Globe className="h-3 w-3 shrink-0 text-primary sm:h-4 sm:w-4" />
                        <span>Acesso vitalício</span>
                      </li>
                    )}
                    {course.has_certificate && (
                      <li className="flex items-center gap-2 sm:gap-3">
                        <Award className="h-3 w-3 shrink-0 text-primary sm:h-4 sm:w-4" />
                        <span>Certificado de conclusão</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Share & Favorite */}
                <div className="flex justify-between border-t border-slate-200 pt-3 dark:border-slate-800 sm:pt-4">
                  <button className="flex items-center gap-1 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:text-sm">
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4" /> Compartilhar
                  </button>
                  <button className="flex items-center gap-1 text-xs font-medium text-slate-600 transition-colors hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 sm:text-sm">
                    <Heart className="h-3 w-3 sm:h-4 sm:w-4" /> Favoritar
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
