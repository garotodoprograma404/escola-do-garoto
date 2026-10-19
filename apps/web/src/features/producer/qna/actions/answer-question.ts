// =====================================================
// PRODUCER Q&A - ANSWER QUESTION ACTION
// =====================================================

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/services/api-errors'

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().min(10, 'A resposta deve ter pelo menos 10 caracteres'),
})

/**
 * Responde uma pergunta de aluno. A API confere que a pergunta é de curso do produtor logado e
 * avisa o aluno pelas notificações.
 */
export async function answerQuestionAction(formData: FormData) {
  try {
    const validatedData = answerSchema.parse({
      questionId: formData.get('questionId') as string,
      answer: formData.get('answer') as string,
    })

    const result = await apiServer(`/producer/questions/${validatedData.questionId}/answer`, {
      method: 'POST',
      body: { answer: validatedData.answer },
    })

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      if (result.error.statusCode === 404 || result.error.statusCode === 403) {
        return { success: false, error: 'Você não tem permissão para responder esta pergunta' }
      }
      return { success: false, error: apiErrorMessage(result.error, 'Erro ao salvar resposta') }
    }

    revalidatePath('/producer/qna')
    revalidatePath('/student/courses')
    revalidatePath('/student')

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }

    console.error('Answer question error:', error)
    return { success: false, error: 'Erro ao processar resposta' }
  }
}
