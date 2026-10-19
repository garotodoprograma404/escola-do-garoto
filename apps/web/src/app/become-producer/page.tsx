import { PublicLayout } from '@/shared/components/PublicLayout'
import { ProducerOnboardingFlow } from '@/features/producer/components/ProducerOnboardingFlow'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'

export async function generateMetadata() {
  const settings = await getPublicGeneralSettings()

  return {
    title: 'Venda seus cursos',
    description: `Publique e venda seus cursos na ${settings.platformName}, sem mensalidade.`,
  }
}

export default async function BecomeProducerPage() {
  const settings = await getPublicGeneralSettings()

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <ProducerOnboardingFlow platformName={settings.platformName} />
      </div>
    </PublicLayout>
  )
}
