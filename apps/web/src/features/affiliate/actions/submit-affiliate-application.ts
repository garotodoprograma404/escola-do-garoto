'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { affiliateApplicationSchema } from '../lib/application-schema'
import { getApiErrorMessage } from '../lib/api-error'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(' ')
  }

  return error instanceof Error ? error.message : fallback
}

export async function submitAffiliateApplicationAction(formData: FormData) {
  try {
    const honeypot = String(formData.get('companyWebsite') || '').trim()
    if (honeypot.length > 0) {
      return { success: true }
    }

    const payload = affiliateApplicationSchema.parse({
      fullName: String(formData.get('fullName') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      instagramHandle: String(formData.get('instagramHandle') || ''),
      youtubeChannel: String(formData.get('youtubeChannel') || ''),
      websiteUrl: String(formData.get('websiteUrl') || ''),
      audienceSize: String(formData.get('audienceSize') || ''),
      audienceSummary: String(formData.get('audienceSummary') || ''),
      promotionChannels: formData
        .getAll('promotionChannels')
        .map((value) => String(value).trim())
        .filter(Boolean),
      experienceSummary: String(formData.get('experienceSummary') || ''),
      whyAffiliate: String(formData.get('whyAffiliate') || ''),
    })

    // A API usa a sessão (quem está logado) e decide se a pessoa já é afiliada ou já se candidatou.
    const result = await apiServer('/affiliate/application', { method: 'POST', body: payload })

    if (!result.ok) {
      if (result.error.statusCode === 401) {
        return { error: 'Faça login para enviar sua candidatura.' }
      }
      return { error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/afiliados')
    revalidatePath('/minha-conta/afiliado')
    revalidatePath('/admin/affiliates')

    return { success: true }
  } catch (error) {
    return {
      error: getErrorMessage(error, 'Não foi possível enviar sua candidatura agora.'),
    }
  }
}
