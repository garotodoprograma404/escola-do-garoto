// =====================================================
// PRODUCER REVIEWS - REPLY TO REVIEW ACTION
// =====================================================

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/services/api-errors'

const replySchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(10, 'A resposta deve ter pelo menos 10 caracteres'),
})

/** Responde uma avaliação. Quem confere que a avaliação é de curso do produtor logado é a API. */
export async function replyToReviewAction(formData: FormData) {
  try {
    const validatedData = replySchema.parse({
      reviewId: formData.get('reviewId') as string,
      response: formData.get('response') as string,
    })

    const result = await apiServer(`/producer/reviews/${validatedData.reviewId}/reply`, {
      method: 'POST',
      body: { response: validatedData.response },
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      if (result.error.statusCode === 404 || result.error.statusCode === 403) {
        return { success: false, error: 'Você não tem permissão para responder esta avaliação' }
      }
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao salvar resposta') }
    }

    revalidatePath('/producer/reviews')

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }

    console.error('Reply to review error:', error)
    return { success: false, error: 'Erro ao processar resposta' }
  }
}
