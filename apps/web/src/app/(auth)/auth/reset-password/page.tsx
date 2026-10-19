import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm.client'
import { AuthBranding } from '@/features/auth/components/AuthBranding'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getPublicGeneralSettings()

  return {
    title: 'Redefinir Senha',
    description: `Redefina sua senha da plataforma ${generalSettings.platformName}`,
  }
}

export default async function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <AuthBranding />
        <ResetPasswordForm />
      </div>
    </div>
  )
}
