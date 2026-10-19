import { getBrandingSettings } from '@/features/admin/settings/actions/branding-actions'
import { getFinancialSettingsForAdmin } from '@/features/admin/settings/actions/financial-actions'
import { getGeneralSettingsForAdmin } from '@/features/admin/settings/actions/general-actions'
import { getLegalSettingsForAdmin } from '@/features/admin/settings/actions/legal-actions'
import { SettingsPageClient } from './SettingsPageClient'

export default async function AdminSettingsPage() {
  const [brandingSettings, generalSettings, financialSettings, legalSettings] = await Promise.all([
    getBrandingSettings(),
    getGeneralSettingsForAdmin(),
    getFinancialSettingsForAdmin(),
    getLegalSettingsForAdmin(),
  ])

  return (
    <SettingsPageClient
      brandingSettings={brandingSettings}
      generalSettings={generalSettings}
      financialSettings={financialSettings}
      legalSettings={legalSettings}
    />
  )
}
