import 'server-only'
import { unstable_cache } from 'next/cache'
import { apiGetPublic } from '@/lib/api'

/** Grupos de configuração que a API entrega publicamente (`GET /api/public/settings/:group`). */
export type PublicSettingsGroup = 'general' | 'branding' | 'financial' | 'legal'

/**
 * Lê um grupo de configurações públicas da API (só chaves `is_public`), com cache do Next por
 * 5 minutos. O cache é invalidado pela tag quando o admin salva (`revalidateTag`).
 * Lança se a API falhar: quem chama decide o valor padrão.
 */
export function cachedPublicSettings<T>(group: PublicSettingsGroup, tag: string) {
  return unstable_cache(
    async (): Promise<T> => {
      const data = await apiGetPublic<T>(`/public/settings/${group}`)
      if (!data) throw new Error(`Configurações públicas "${group}" não encontradas`)
      return data
    },
    [`public-settings-${group}-v1`],
    { revalidate: 300, tags: [tag] },
  )
}
