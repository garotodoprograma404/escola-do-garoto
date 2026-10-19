'use client'

import { useState } from 'react'
import { SettingsSidebar } from '@/features/admin/settings/components/SettingsSidebar'
import { GeneralSettings } from '@/features/admin/settings/components/GeneralSettings'
import { BrandingSettings } from '@/features/admin/settings/components/BrandingSettings.client'
import { FinancialSettings } from '@/features/admin/settings/components/FinancialSettings.client'
import { LegalSettings } from '@/features/admin/settings/components/LegalSettings.client'
import { MercadoPagoSettings } from '@/features/admin/settings/components/MercadoPagoSettings.client'
import { MailSettings } from '@/features/admin/settings/components/MailSettings.client'
import type {
  MailSettingsView,
  PaymentGatewayView,
  SettingsSection,
  PlatformSettings,
} from '@/features/admin/settings/types'
import type { BrandingSettings as BrandingSettingsType } from '@/features/admin/settings/actions/branding-actions'
import { saveFinancialSettings } from '@/features/admin/settings/actions/financial-actions'
import { saveGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { saveLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { useToast } from '@/shared/hooks/use-toast'

interface SettingsPageClientProps {
  brandingSettings: BrandingSettingsType
  generalSettings: PlatformSettings['general']
  financialSettings: PlatformSettings['financial']
  legalSettings: PlatformSettings['legal']
  paymentGateway: PaymentGatewayView | null
  mailSettings: MailSettingsView | null
}

export function SettingsPageClient({
  brandingSettings,
  generalSettings,
  financialSettings,
  legalSettings,
  paymentGateway,
  mailSettings,
}: SettingsPageClientProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const [currentGeneralSettings, setCurrentGeneralSettings] = useState(generalSettings)
  const [currentFinancialSettings, setCurrentFinancialSettings] = useState(financialSettings)
  const [currentLegalSettings, setCurrentLegalSettings] = useState(legalSettings)
  const { toast } = useToast()

  const handleSaveGeneral = async (data: PlatformSettings['general']) => {
    const result = await saveGeneralSettings(data)

    if (!result.success) {
      toast({
        title: 'Erro',
        description: result.error || 'Não foi possível salvar as configurações gerais.',
        variant: 'destructive',
      })
      return
    }

    setCurrentGeneralSettings(result.data || data)
    toast({
      title: 'Configurações salvas',
      description: 'As configurações gerais foram atualizadas com sucesso.',
    })
  }

  const handleSaveFinancial = async (data: PlatformSettings['financial']) => {
    const result = await saveFinancialSettings(data)

    if (!result.success) {
      toast({
        title: 'Erro',
        description: result.error || 'Não foi possível salvar as configurações financeiras.',
        variant: 'destructive',
      })
      return
    }

    setCurrentFinancialSettings(result.data || data)
    toast({
      title: 'Configurações salvas',
      description: 'As configurações financeiras foram atualizadas com sucesso.',
    })
  }

  const handleSaveLegal = async (data: PlatformSettings['legal']) => {
    const result = await saveLegalSettings(data)

    if (!result.success) {
      toast({
        title: 'Erro',
        description: result.error || 'Não foi possível salvar as configurações legais.',
        variant: 'destructive',
      })
      return
    }

    setCurrentLegalSettings(result.data || data)
    toast({
      title: 'Configurações salvas',
      description: 'As configurações legais foram atualizadas com sucesso.',
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
          Configurações da Plataforma
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Configure todos os aspectos da sua plataforma
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeSection === 'general' && (
            <GeneralSettings settings={currentGeneralSettings} onSave={handleSaveGeneral} />
          )}

          {activeSection === 'branding' && <BrandingSettings settings={brandingSettings} />}

          {activeSection === 'financial' && (
            <div className="space-y-6">
              {paymentGateway ? <MercadoPagoSettings initial={paymentGateway} /> : null}
              <FinancialSettings settings={currentFinancialSettings} onSave={handleSaveFinancial} />
            </div>
          )}

          {activeSection === 'email' && mailSettings ? (
            <MailSettings initial={mailSettings} />
          ) : null}

          {activeSection === 'legal' && (
            <LegalSettings settings={currentLegalSettings} onSave={handleSaveLegal} />
          )}
        </div>
      </div>
    </div>
  )
}
