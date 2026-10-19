'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/api-error'
import { cachedPublicSettings } from '../lib/public-settings'
import type { LegalSettings as LegalSettingsType } from '../types'

const DEFAULT_LEGAL_SETTINGS: LegalSettingsType = {
  termsOfServiceUrl: '/termos-de-uso',
  privacyPolicyUrl: '/politica-de-privacidade',
  refundPolicyUrl: '/politica-de-reembolso',
  cookiePolicyUrl: '/politica-de-cookies',
  companyName: 'Escola do Garoto;',
  companyDocument: '00.000.000/0001-00',
  companyAddress: 'Brasil',
}

const getPublicLegalSettingsCached = cachedPublicSettings<LegalSettingsType>(
  'legal',
  'legal-settings',
)

export async function getPublicLegalSettings(): Promise<LegalSettingsType> {
  try {
    return await getPublicLegalSettingsCached()
  } catch (error) {
    console.error('Error fetching public legal settings:', error)
    return { ...DEFAULT_LEGAL_SETTINGS }
  }
}

export async function getLegalSettingsForAdmin(): Promise<LegalSettingsType> {
  const result = await apiServer<LegalSettingsType>('/admin/settings/legal')
  if (!result.ok) {
    console.error('Error fetching legal settings for admin:', result.error.message)
    return { ...DEFAULT_LEGAL_SETTINGS }
  }
  return result.data
}

export async function saveLegalSettings(input: LegalSettingsType) {
  const result = await apiServer<LegalSettingsType>('/admin/settings/legal', {
    method: 'PUT',
    body: input,
  })

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível salvar as configurações legais'),
    }
  }

  revalidateTag('legal-settings', 'max')
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')

  return { success: true, data: result.data }
}
