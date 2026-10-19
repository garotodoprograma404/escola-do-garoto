'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/api-error'
import { cachedPublicSettings } from '../lib/public-settings'

export interface BrandingSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  fontFamily: string
}

const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  primaryColor: '#39FF88',
  secondaryColor: '#0D1117',
  accentColor: '#FF2E88',
  logoUrl: '/brand/garoto.svg',
  faviconUrl: '',
  fontFamily: 'Inter',
}

const getBrandingSettingsCached = cachedPublicSettings<BrandingSettings>(
  'branding',
  'branding-settings',
)

/**
 * Busca as configurações de marca (públicas: cores, logo, favicon, fonte).
 */
export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    return await getBrandingSettingsCached()
  } catch (error) {
    // Páginas estáticas durante o build chegam aqui sem requisição: segue com o padrão.
    const message = error instanceof Error ? error.message : ''
    if (error && typeof error === 'object' && 'digest' in error) {
      if (String((error as { digest: unknown }).digest).includes('DYNAMIC_SERVER_USAGE')) {
        return DEFAULT_BRANDING_SETTINGS
      }
    }
    if (
      message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED') ||
      message.includes('fetch failed')
    ) {
      console.warn('Falha de rede ao carregar branding, usando padrao.')
      return DEFAULT_BRANDING_SETTINGS
    }

    console.error('Unexpected error fetching branding settings:', error)
    return DEFAULT_BRANDING_SETTINGS
  }
}

/**
 * Salva as configurações de marca. Só admin (a API recusa os demais) e só campos conhecidos.
 */
export async function saveBrandingSettings(settings: Partial<BrandingSettings>) {
  const result = await apiServer<BrandingSettings>('/admin/settings/branding', {
    method: 'PUT',
    body: settings,
  })

  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao salvar configurações') }
  }

  // Revalidar todas as páginas para aplicar as novas cores
  revalidateTag('branding-settings', 'max')
  revalidatePath('/', 'layout')

  return { success: true }
}
