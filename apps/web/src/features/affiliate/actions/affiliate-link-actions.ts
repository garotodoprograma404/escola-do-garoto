'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { getApiErrorMessage } from '../lib/api-error'
import { normalizeAffiliateDestinationPath, normalizeAffiliateOptionalText } from '../lib/link-form'

const affiliateLinkUpsertSchema = z.object({
  linkId: z.string().optional(),
  partnershipId: z.string().min(1, 'Parceria inválida'),
  campaignName: z.string().trim().max(80).optional(),
  trafficSource: z.string().trim().max(80).optional(),
  destinationPath: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
})

const affiliateLinkToggleSchema = z.object({
  linkId: z.string().min(1, 'Link inválido'),
  isActive: z.boolean(),
})

function toId(value: string, message: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(message)
  }
  return id
}

/**
 * Cria ou edita um link do afiliado logado. Quem garante que a parceria e o link são DELE é a API
 * (pela sessão); aqui só validamos o formulário para dar erro rápido na tela.
 */
export async function upsertAffiliateLinkAction(input: unknown) {
  try {
    const validated = affiliateLinkUpsertSchema.parse(input)
    const partnershipId = toId(validated.partnershipId, 'Parceria inválida')

    const body = {
      partnershipId,
      campaignName: normalizeAffiliateOptionalText(validated.campaignName) ?? undefined,
      trafficSource: normalizeAffiliateOptionalText(validated.trafficSource) ?? undefined,
      destinationPath: normalizeAffiliateDestinationPath(validated.destinationPath) ?? undefined,
      notes: normalizeAffiliateOptionalText(validated.notes) ?? undefined,
      isActive: validated.isActive,
    }

    const result = validated.linkId
      ? await apiServer(`/affiliate/links/${toId(validated.linkId, 'Link inválido')}`, {
          method: 'PUT',
          body,
        })
      : await apiServer('/affiliate/links', { method: 'POST', body })

    if (!result.ok) {
      return { success: false, error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/affiliate')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao salvar link de afiliado',
    }
  }
}

export async function toggleAffiliateLinkStatusAction(input: unknown) {
  try {
    const validated = affiliateLinkToggleSchema.parse(input)
    const linkId = toId(validated.linkId, 'Link inválido')

    const result = await apiServer(`/affiliate/links/${linkId}/status`, {
      method: 'PATCH',
      body: { isActive: validated.isActive },
    })

    if (!result.ok) {
      return { success: false, error: getApiErrorMessage(result.error) }
    }

    revalidatePath('/affiliate')

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar status do link',
    }
  }
}
