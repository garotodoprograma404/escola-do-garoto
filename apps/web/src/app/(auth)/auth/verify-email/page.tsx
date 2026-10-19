import type { Metadata } from 'next'
import { AuthBranding } from '@/features/auth/components/AuthBranding'
import { VerifyEmailCard } from '@/features/auth/components/VerifyEmailCard.client'

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <AuthBranding />
        <VerifyEmailCard />
      </div>
    </div>
  )
}
