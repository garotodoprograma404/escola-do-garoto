'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import {
  updateProducerLeadSchema,
  type UpdateProducerLeadInput,
} from '../lib/producerLeadAdminValidations'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

/**
 * Atualiza o funil de um contato de produtor. Só admin (a API confere o papel), que também grava
 * quem tratou o contato, a data do primeiro contato e a auditoria.
 */
export async function updateProducerLeadAction(input: UpdateProducerLeadInput) {
  try {
    const validated = updateProducerLeadSchema.parse(input)

    const result = await apiServer(`/admin/producer-leads/${validated.leadId}`, {
      method: 'PATCH',
      body: { status: validated.status, adminNotes: validated.adminNotes ?? undefined },
    })

    if (!result.ok) {
      if (result.error.statusCode === 404) return { error: 'Lead não encontrado' }
      if (result.error.statusCode === 401 || result.error.statusCode === 403) {
        return { error: 'Sem permissao para atualizar este lead' }
      }
      console.error('Error updating producer lead:', result.error.message)
      return { error: 'Não foi possível atualizar o lead agora' }
    }

    revalidatePath('/admin/producer-leads')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in updateProducerLeadAction:', error)
    return { error: getErrorMessage(error, 'Erro ao atualizar lead') }
  }
}
