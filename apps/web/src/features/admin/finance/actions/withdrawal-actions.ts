'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

const idSchema = z.string().regex(/^\d{1,15}$/, 'ID inválido')

const rejectSchema = z.object({
  id: idSchema,
  reason: z.string().min(10, 'O motivo deve ter pelo menos 10 caracteres'),
})

function messageOf(statusCode: number, message: string, fallback: string): string {
  if (statusCode === 401) return 'Usuário não autenticado'
  if (statusCode === 403) return 'Sem permissão para esta ação'
  return message || fallback
}

/**
 * Aprova um saque pendente. Chamador fino da API: ela exige papel de admin, só deixa aprovar o que está pendente e registra quem aprovou.
 */
export async function approveWithdrawalAction(id: string) {
  const validation = idSchema.safeParse(id)
  if (!validation.success) {
    throw new Error('ID inválido')
  }

  const result = await apiServer(`/admin/finance/withdrawals/${validation.data}/approve`, {
    method: 'POST',
  })
  if (!result.ok) {
    throw new Error(
      messageOf(result.error.statusCode, result.error.message, 'Erro ao aprovar saque'),
    )
  }

  revalidatePath('/admin/finance')
}

export async function rejectWithdrawalAction(id: string, reason: string) {
  const validation = rejectSchema.safeParse({ id, reason })
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? 'Dados inválidos')
  }

  const result = await apiServer(`/admin/finance/withdrawals/${validation.data.id}/reject`, {
    method: 'POST',
    body: { reason: validation.data.reason },
  })
  if (!result.ok) {
    throw new Error(
      messageOf(result.error.statusCode, result.error.message, 'Erro ao rejeitar saque'),
    )
  }

  revalidatePath('/admin/finance')
}

/** Marca o saque aprovado como PAGO (dinheiro enviado fora do sistema). */
export async function payWithdrawalAction(id: string, details?: { transactionId?: string }) {
  const validation = idSchema.safeParse(id)
  if (!validation.success) {
    throw new Error('ID inválido')
  }

  const result = await apiServer(`/admin/finance/withdrawals/${validation.data}/pay`, {
    method: 'POST',
    body: { transactionId: details?.transactionId || undefined },
  })
  if (!result.ok) {
    throw new Error(messageOf(result.error.statusCode, result.error.message, 'Erro ao pagar saque'))
  }

  revalidatePath('/admin/finance')
}
