// =====================================================
// PUBLIC LAYOUT - WRAPPER FOR PUBLIC PAGES
// =====================================================

import { PublicHeader } from './PublicHeader.client'
import { PublicFooter } from './PublicFooter'
import { PublicWhatsAppButton } from './PublicWhatsAppButton'
import { getBrandingSettings } from '@/features/admin/settings/actions/branding-actions'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getRoleDashboardPath } from '@/shared/lib/navigation'

interface PublicLayoutProps {
  children: React.ReactNode
  showFooter?: boolean
}

export async function PublicLayout({ children, showFooter = true }: PublicLayoutProps) {
  const [generalSettings, brandingSettings, legalSettings, authContext] = await Promise.all([
    getPublicGeneralSettings(),
    getBrandingSettings(),
    getPublicLegalSettings(),
    getAuthenticatedUserContext(),
  ])
  const supportPhoneText = generalSettings.supportPhone.trim()
  const initialIsAuthenticated = Boolean(authContext)
  const initialDashboardPath = authContext?.primaryRole
    ? getRoleDashboardPath(authContext.primaryRole)
    : '/student'

  if (generalSettings.maintenanceMode) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
            {brandingSettings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandingSettings.logoUrl}
                alt={`Logo ${generalSettings.platformName}`}
                className="h-12 w-auto max-w-full object-contain"
              />
            ) : null}
            <h1 className="text-3xl font-bold">{generalSettings.platformName} em manutenção</h1>
            <p className="leading-relaxed text-slate-300">
              Estamos realizando melhorias e voltaremos em breve. Se precisar de suporte, entre em
              contato por {generalSettings.supportEmail}
              {supportPhoneText ? ` ou ${supportPhoneText}` : ''}.
            </p>
          </div>
        </main>
        <PublicWhatsAppButton phone={generalSettings.supportPhone} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        platformName={generalSettings.platformName}
        logoUrl={brandingSettings.logoUrl}
        initialIsAuthenticated={initialIsAuthenticated}
        initialDashboardPath={initialDashboardPath}
      />

      {/* Main Content - Add padding for fixed header */}
      <main className="flex-1 pt-16 lg:pt-28">{children}</main>

      {showFooter && (
        <PublicFooter
          settings={generalSettings}
          legalSettings={legalSettings}
          logoUrl={brandingSettings.logoUrl}
        />
      )}

      <PublicWhatsAppButton phone={generalSettings.supportPhone} />
    </div>
  )
}
