'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/services/api-errors'

function getFormString(formData: FormData, field: string): string | undefined {
  const value = formData.get(field)
  return typeof value === 'string' ? value : undefined
}

function normalizeOptionalText(value?: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Texto do slug só para revalidar a página pública; a regra de verdade é a da API. */
function isSafeSlug(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-z0-9_-]+$/i.test(value))
}

/**
 * Salva o perfil do produtor logado. As regras (slug único, links http(s), limites) ficam na API,
 * que sempre grava no perfil da sessão.
 */
export async function updateProducerProfile(formData: FormData) {
  try {
    const result = await apiServer<{ slug: string | null }>('/producer/profile', {
      method: 'PATCH',
      body: {
        full_name: getFormString(formData, 'full_name') ?? '',
        display_name: getFormString(formData, 'display_name'),
        bio: getFormString(formData, 'bio'),
        slug: getFormString(formData, 'slug'),
        expertise_areas: getFormString(formData, 'expertise_areas'),
        cover_url: getFormString(formData, 'cover_url'),
        website_url: getFormString(formData, 'website_url'),
        instagram_url: getFormString(formData, 'instagram_url'),
        youtube_url: getFormString(formData, 'youtube_url'),
        linkedin_url: getFormString(formData, 'linkedin_url'),
        facebook_url: getFormString(formData, 'facebook_url'),
        public_profile_enabled: getFormString(formData, 'public_profile_enabled') === 'true',
      },
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao atualizar perfil') }
    }

    const previousSlug = normalizeOptionalText(getFormString(formData, 'previous_slug'))
    const resolvedSlug = result.data?.slug

    revalidatePath('/producer/profile')
    if (isSafeSlug(previousSlug)) revalidatePath(`/instrutor/${previousSlug}`)
    if (isSafeSlug(resolvedSlug)) revalidatePath(`/instrutor/${resolvedSlug}`)
    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao atualizar perfil' }
  }
}

/** Troca a senha de quem está logado (a API confere a senha atual e encerra as outras sessões). */
export async function updateProducerPassword(formData: FormData) {
  try {
    const result = await apiServer('/producer/profile/password', {
      method: 'POST',
      body: {
        currentPassword: getFormString(formData, 'currentPassword') ?? '',
        newPassword: getFormString(formData, 'newPassword') ?? '',
        confirmPassword: getFormString(formData, 'confirmPassword') ?? '',
      },
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao atualizar senha') }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao atualizar senha' }
  }
}

/** Guarda a foto que a pessoa acabou de enviar (a API só aceita arquivo enviado por ela mesma). */
export async function uploadProducerAvatar(formData: FormData) {
  try {
    const avatarUrl = formData.get('avatar_url') as string | null

    if (!avatarUrl) {
      return { success: false, error: 'URL do avatar não fornecida' }
    }

    const result = await apiServer('/producer/profile/avatar', {
      method: 'PUT',
      body: { avatar_url: avatarUrl },
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao atualizar avatar') }
    }

    revalidatePath('/producer/profile')
    return { success: true }
  } catch (error) {
    console.error('Error uploading producer avatar:', error)
    return { success: false, error: 'Erro ao atualizar avatar' }
  }
}
