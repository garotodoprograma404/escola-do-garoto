'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../services/api-errors'

export interface SubmitProducerApplicationInput {
  name: string
  phone: string
  cpf: string
  expertiseArea: string
  experienceYears: number
  bio: string
  whyProduce: string
}

/** Envia a candidatura formal de produtor da conta logada. A API valida de novo e confere o dono. */
export async function submitProducerApplicationAction(input: SubmitProducerApplicationInput) {
  const result = await apiServer('/producer-applications', { method: 'POST', body: input })

  if (!result.ok) {
    return { error: apiErrorMessage(result.error, 'Não foi possível enviar sua candidatura') }
  }

  revalidatePath('/minha-conta/produtor')
  revalidatePath('/admin/producer-leads')
  return { success: true }
}
