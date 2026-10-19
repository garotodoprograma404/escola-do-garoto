import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/LoginForm.client'
import { DemoLoginButtons } from '@/features/auth/components/DemoLoginButtons.client'
import { getBrandingSettings } from '@/features/admin/settings/actions/branding-actions'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getPublicGeneralSettings()

  return {
    title: 'Login',
    description: `Faça login na plataforma ${generalSettings.platformName}`,
  }
}

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirectPath = params.redirect || params.next
  const [generalSettings, brandingSettings, legalSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getBrandingSettings(),
    getPublicLegalSettings(),
  ])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      {process.env.DEMO_MODE === 'true' ? <DemoLoginButtons /> : null}
      <LoginForm
        platformName={generalSettings.platformName}
        logoUrl={brandingSettings.logoUrl}
        privacyPolicyUrl={legalSettings.privacyPolicyUrl}
        termsOfServiceUrl={legalSettings.termsOfServiceUrl}
        redirectPath={redirectPath}
      />
    </div>
  )
}
