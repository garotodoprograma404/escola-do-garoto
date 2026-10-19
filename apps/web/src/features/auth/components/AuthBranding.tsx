import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getBrandingSettings } from '@/features/admin/settings/actions/branding-actions'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'

interface AuthBrandingProps {
  className?: string
}

export async function AuthBranding({ className }: AuthBrandingProps) {
  const [generalSettings, brandingSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getBrandingSettings(),
  ])

  const logoUrl = brandingSettings.logoUrl?.trim() || ''
  const hasLogo = logoUrl.length > 0

  return (
    <Link
      href="/"
      className={`mx-auto flex w-fit items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-slate-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-900 ${className ?? ''}`}
      aria-label={`Ir para ${generalSettings.platformName}`}
    >
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`Logo ${generalSettings.platformName}`}
          className="h-8 w-auto max-w-[10rem] object-contain"
        />
      ) : (
        <>
          <div className="shrink-0 rounded-lg bg-brand-500 p-1.5 text-black">
            <BookOpen size={18} />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            {generalSettings.platformName}
          </span>
        </>
      )}
    </Link>
  )
}
