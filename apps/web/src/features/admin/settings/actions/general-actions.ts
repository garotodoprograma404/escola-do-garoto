'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { isTransientNetworkError } from '@/shared/lib/observability'
import { apiErrorMessage } from '../lib/api-error'
import { cachedPublicSettings } from '../lib/public-settings'
import type { GeneralSettings as GeneralSettingsType } from '../types'

const DEFAULT_GENERAL_SETTINGS: GeneralSettingsType = {
  platformName: 'Escola do Garoto;',
  platformDescription: 'Plataforma de cursos online',
  supportEmail: 'contato@exemplo.com.br',
  supportPhone: '',
  timezone: 'America/Sao_Paulo',
  language: 'pt-BR',
  currency: 'BRL',
  maintenanceMode: false,
}

const getPublicGeneralSettingsCached = cachedPublicSettings<GeneralSettingsType>(
  'general',
  'general-settings',
)

export async function getPublicGeneralSettings(): Promise<GeneralSettingsType> {
  try {
    return await getPublicGeneralSettingsCached()
  } catch (error) {
    if (isTransientNetworkError(error)) {
      console.warn('General settings indisponivel temporariamente, usando padrao.')
    } else {
      console.error('Error fetching public general settings:', error)
    }
    return { ...DEFAULT_GENERAL_SETTINGS }
  }
}

export async function getGeneralSettingsForAdmin(): Promise<GeneralSettingsType> {
  const result = await apiServer<GeneralSettingsType>('/admin/settings/general')
  if (!result.ok) {
    console.error('Error fetching admin general settings:', result.error.message)
    return { ...DEFAULT_GENERAL_SETTINGS }
  }
  return result.data
}

export async function saveGeneralSettings(input: GeneralSettingsType) {
  // A validação e a checagem de papel (admin) são da API.
  const result = await apiServer<GeneralSettingsType>('/admin/settings/general', {
    method: 'PUT',
    body: input,
  })

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível salvar as configurações'),
    }
  }

  revalidateTag('general-settings', 'max')
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')

  return { success: true, data: result.data }
}
