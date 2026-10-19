import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/components/RegisterForm.client'
import { AuthBranding } from '@/features/auth/components/AuthBranding'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getPublicGeneralSettings()

  return {
    title: 'Cadastro',
    description: `Crie sua conta na plataforma ${generalSettings.platformName}`,
  }
}

interface RegisterPageProps {
  searchParams: Promise<{
    redirect?: string
    next?: string
  }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams
  const redirectPath = params.redirect || params.next
  const legalSettings = await getPublicLegalSettings()

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <AuthBranding />
        <RegisterForm
          privacyPolicyUrl={legalSettings.privacyPolicyUrl}
          termsOfServiceUrl={legalSettings.termsOfServiceUrl}
          refundPolicyUrl={legalSettings.refundPolicyUrl}
          redirectPath={redirectPath}
        />
      </div>
    </div>
  )
}
