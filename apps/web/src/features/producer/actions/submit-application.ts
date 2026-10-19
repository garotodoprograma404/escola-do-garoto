'use server'

import { revalidatePath } from 'next/cache'
import { ZodError } from 'zod'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../services/api-errors'
import { producerLeadSchema } from '../lib/producer-lead-validations'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}

/**
 * Contato da página pública "seja produtor" (visitante, sem login). A API valida de novo, evita
 * repetição do mesmo contato e limita quantos contatos um e-mail pode mandar por dia.
 */
export async function submitApplicationAction(formData: FormData) {
  try {
    const honeypot = String(formData.get('companyWebsite') || '').trim()
    if (honeypot.length > 0) {
      return { success: true }
    }

    const data = producerLeadSchema.parse({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      hasInternetExperience: formData.get('hasInternetExperience') as string,
      hasRecordedContent: formData.get('hasRecordedContent') as string,
      topic: formData.get('topic') as string,
      notes: formData.get('notes') as string,
    })

    const result = await apiServer('/producer-leads', {
      method: 'POST',
      body: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        city: data.city,
        hasOnlineExperience: data.hasInternetExperience === 'yes',
        hasRecordedContent: data.hasRecordedContent === 'yes',
        topic: data.topic ?? undefined,
        notes: data.notes ?? undefined,
      },
    })

    if (!result.ok) {
      console.error('Error creating producer lead:', result.error.message)
      throw new Error(
        result.error.statusCode === 429 || result.error.statusCode === 400
          ? apiErrorMessage(result.error)
          : 'Não foi possível enviar seu contato agora',
      )
    }

    revalidatePath('/become-producer')
    revalidatePath('/admin/producer-leads')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error submitting application:', error)
    return { error: getErrorMessage(error, 'Erro ao enviar contato') }
  }
}
