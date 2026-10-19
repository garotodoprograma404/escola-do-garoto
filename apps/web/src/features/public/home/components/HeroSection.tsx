// =====================================================
// HERO SECTION - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getActiveBanners } from '../services/bannerService'
import { BannerCarousel } from './BannerCarousel.client'

/** Topo da home: os banners ativos do admin; sem nenhum, a apresentação da plataforma. */
export async function HeroSection() {
  const banners = await getActiveBanners()
  if (banners.length > 0) {
    return <BannerCarousel banners={banners} />
  }

  const settings = await getPublicGeneralSettings()

  return (
    <section className="mx-4 mt-4 rounded-3xl bg-black px-8 py-20 text-center text-white shadow-2xl">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        {settings.platformName}
      </h1>
      {settings.platformDescription && (
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
          {settings.platformDescription}
        </p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/catalog">Ver cursos</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
        >
          <Link href="/become-producer">Ensinar</Link>
        </Button>
      </div>
    </section>
  )
}
