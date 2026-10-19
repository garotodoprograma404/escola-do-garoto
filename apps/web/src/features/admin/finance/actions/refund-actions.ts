'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const idSchema = z.string().regex(/^\d{1,15}$/, 'ID inválido')

const rejectSchema = z.object({
  id: idSchema,
  reason: z
    .string()
    .trim()
    .min(10, 'O motivo deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo longo demais'),
})

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string }

function messageOf(statusCode: number, message: string, fallback: string): string {
  if (statusCode === 401) return 'Usuário não autenticado'
  if (statusCode === 403) return 'Sem permissão para esta ação'
  return message || fallback
}

/**
 * Aprova o reembolso e pede o estorno ao meio de pagamento. Chamador fino da API (só admin), que
 * fala com o Mercado Pago e devolve se o estorno já foi confirmado ou se o webhook vai concluir.
 */
export async function approveRefundAction(
  id: string,
): Promise<ActionResult<{ result: 'refunded' | 'awaiting_confirmation' }>> {
  const validation = idSchema.safeParse(id)
  if (!validation.success) return { success: false, error: 'ID inválido' }

  const response = await apiServer<{ result: 'refunded' | 'awaiting_confirmation' }>(
    `/admin/finance/refunds/${validation.data}/approve`,
    { method: 'POST' },
  )
  if (!response.ok) {
    return {
      success: false,
      error: messageOf(
        response.error.statusCode,
        response.error.message,
        'Erro ao aprovar o reembolso',
      ),
    }
  }
  revalidatePath('/admin/finance')
  return { success: true, data: { result: response.data.result } }
}

/** Recusa o pedido com motivo (o aluno vê o motivo no sino e na compra). */
export async function rejectRefundAction(id: string, reason: string): Promise<ActionResult> {
  const validation = rejectSchema.safeParse({ id, reason })
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const response = await apiServer(`/admin/finance/refunds/${validation.data.id}/reject`, {
    method: 'POST',
    body: { reason: validation.data.reason },
  })
  if (!response.ok) {
    return {
      success: false,
      error: messageOf(
        response.error.statusCode,
        response.error.message,
        'Erro ao recusar o reembolso',
      ),
    }
  }
  revalidatePath('/admin/finance')
  return { success: true, data: undefined }
}
