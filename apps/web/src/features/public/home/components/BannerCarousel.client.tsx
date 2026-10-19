// =====================================================
// BANNER CAROUSEL - CLIENT COMPONENT
// =====================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import type { Banner } from '../types'

interface BannerCarouselProps {
  banners: Banner[]
}

/** Conta a visualização ou o clique direto da API, para o IP ser o de quem está no site. */
function trackBanner(action: 'track-view' | 'track-click', bannerId: string) {
  fetch(`/api/banners/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bannerId: Number(bannerId) }),
    keepalive: true,
  }).catch(() => undefined)
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const viewRecordedRef = useRef<string | null>(null)

  // Auto-play carousel
  useEffect(() => {
    if (banners.length <= 1) return

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [banners.length])

  // Track view when slide changes
  useEffect(() => {
    if (banners.length > 0 && banners[currentSlide]) {
      const bannerId = banners[currentSlide].id
      if (viewRecordedRef.current !== bannerId) {
        trackBanner('track-view', bannerId)
        viewRecordedRef.current = bannerId
      }
    }
  }, [currentSlide, banners])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1))

  if (banners.length === 0) return null

  const currentBanner = banners[currentSlide]

  return (
    <section className="relative mx-4 mt-4 flex h-[500px] items-center overflow-hidden rounded-3xl bg-black text-white shadow-2xl transition-colors duration-700">
      {/* Background Image with Responsive Switching */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet={currentBanner.mobileImageUrl || currentBanner.desktopImageUrl}
          />
          <img
            src={currentBanner.desktopImageUrl}
            alt={currentBanner.title}
            className="h-full w-full object-cover opacity-50 transition-opacity duration-700"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col items-start justify-center px-8 py-10">
        <span className="mb-6 rounded-full border border-primary/30 bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm duration-500 animate-in fade-in slide-in-from-bottom-4">
          Destaque
        </span>
        <h1
          className={`mb-6 max-w-2xl text-4xl font-bold tracking-tight drop-shadow-lg md:text-6xl ${
            currentBanner.textColor === 'black' ? 'text-black' : 'text-white'
          }`}
        >
          {currentBanner.title}
        </h1>
        <p
          className={`mb-10 max-w-2xl text-lg drop-shadow-md md:text-xl ${
            currentBanner.textColor === 'black' ? 'text-slate-900' : 'text-slate-200'
          }`}
        >
          {currentBanner.subtitle}
        </p>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            onClick={() => trackBanner('track-click', currentBanner.id)}
            className="gap-2"
          >
            <Link href={currentBanner.ctaLink}>
              {currentBanner.ctaText} <ArrowRight size={20} />
            </Link>
          </Button>
        </div>
      </div>

      {/* Carousel Controls (Only if > 1 slide) */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Banner anterior"
            onClick={prevSlide}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            aria-label="Próximo banner"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Ir para o banner ${idx + 1}`}
                onClick={() => setCurrentSlide(idx)}
                className={`h-3 rounded-full transition-all ${
                  currentSlide === idx ? 'w-8 bg-primary' : 'w-3 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
