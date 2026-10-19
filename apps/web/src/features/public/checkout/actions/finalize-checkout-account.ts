'use server'

import { apiServer } from '@/lib/server-api'

interface FinalizeCheckoutAccountInput {
  orderId: string
  password: string
}

interface FinalizeCheckoutAccountResult {
  success: boolean
  message: string
  redirect_url?: string
}

/**
 * "Finalizar conta" depois de pagar sem ter conta. Chamador fino da API: ela confere que o pedido
 * foi pago e é "sem conta", cria a conta pelo cadastro normal (o e-mail do pedido recebe o link de
 * confirmação, e só depois dele a senha vale) e libera a matrícula. Por isso não há mais login
 * automático aqui: quem prova ser dono do e-mail é o link, não o número do pedido.
 */
export async function finalizeCheckoutAccountAction(
  input: FinalizeCheckoutAccountInput,
): Promise<FinalizeCheckoutAccountResult> {
  try {
    const orderId = String(input.orderId || '').trim()
    const password = String(input.password || '')

    if (!orderId) {
      return { success: false, message: 'Pedido inválido para finalizar conta.' }
    }

    if (password.trim().length < 8) {
      return { success: false, message: 'A senha deve ter no mínimo 8 caracteres.' }
    }

    const result = await apiServer<FinalizeCheckoutAccountResult>(
      `/checkout/orders/${encodeURIComponent(orderId)}/finalize-account`,
      { method: 'POST', body: { password } },
    )

    if (!result.ok) {
      return {
        success: false,
        message: result.error.message,
        // A conta já existia: o caminho agora é entrar (ou recuperar a senha).
        redirect_url: result.error.statusCode === 409 ? '/login' : undefined,
      }
    }

    return result.data
  } catch (error) {
    console.error('finalizeCheckoutAccountAction error:', error)
    return { success: false, message: 'Erro ao finalizar conta. Tente novamente.' }
  }
}
