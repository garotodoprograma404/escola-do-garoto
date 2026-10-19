'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const refundSchema = z.object({
  transaction_id: z.string().regex(/^\d{1,15}$/, 'Transação inválida'),
  reason: z
    .string()
    .trim()
    .min(10, 'Motivo deve ter pelo menos 10 caracteres')
    .max(1000, 'Motivo longo demais'),
})

/**
 * Pede reembolso de uma compra (até 7 dias depois dela, um pedido por compra). Chamador fino da
 * API, que confere o dono da compra, o prazo e a duplicidade.
 */
export async function requestRefund(formData: FormData) {
  try {
    const parsed = refundSchema.safeParse({
      transaction_id: formData.get('transaction_id'),
      reason: formData.get('reason'),
    })

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    }

    const result = await apiServer('/finance/student/refunds', {
      method: 'POST',
      body: { transactionId: Number(parsed.data.transaction_id), reason: parsed.data.reason },
    })

    if (!result.ok) {
      return {
        success: false,
        error: result.error.statusCode === 401 ? 'Não autenticado' : result.error.message,
      }
    }

    revalidatePath('/student/financials')
    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao solicitar reembolso' }
  }
}
