'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'

/**
 * Ações do sino. A API só mexe em notificação da PRÓPRIA pessoa (o id é conferido junto com o
 * dono), então um id de outro usuário simplesmente não faz nada.
 */

const notificationIdSchema = z.string().uuid()

async function run(
  request: () => ReturnType<typeof apiServer<void>>,
  errorMessage: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await request()
  if (!result.ok) {
    return {
      success: false,
      error: result.error.statusCode === 401 ? 'Não autenticado' : errorMessage,
    }
  }
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAsRead(notificationId: string) {
  const id = notificationIdSchema.safeParse(notificationId)
  if (!id.success) return { success: false, error: 'Erro ao marcar notificação como lida' }
  return run(
    () => apiServer<void>(`/notifications/${id.data}/read`, { method: 'POST' }),
    'Erro ao marcar notificação como lida',
  )
}

export async function markAllAsRead() {
  return run(
    () => apiServer<void>('/notifications/read-all', { method: 'POST' }),
    'Erro ao marcar todas as notificações como lidas',
  )
}

export async function deleteNotification(notificationId: string) {
  const id = notificationIdSchema.safeParse(notificationId)
  if (!id.success) return { success: false, error: 'Erro ao deletar notificação' }
  return run(
    () => apiServer<void>(`/notifications/${id.data}`, { method: 'DELETE' }),
    'Erro ao deletar notificação',
  )
}

export async function deleteAllRead() {
  return run(
    () => apiServer<void>('/notifications/read', { method: 'DELETE' }),
    'Erro ao deletar notificações lidas',
  )
}
