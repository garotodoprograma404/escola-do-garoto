// Notification Service: o sino lê da API (`/api/notifications`), sempre só as da pessoa logada.
import { apiServer } from '@/lib/server-api'
import type { Notification, NotificationStats } from '../types/notifications'

export async function getNotifications(limit: number = 50): Promise<Notification[]> {
  const result = await apiServer<Notification[]>('/notifications', {
    query: { limit: Math.min(Math.max(Math.trunc(limit) || 50, 1), 100) },
  })
  if (!result.ok) {
    // Sem login a API responde 401: lista vazia.
    if (result.error.statusCode !== 401) {
      console.error('Error fetching notifications:', result.error.message)
    }
    return []
  }
  return result.data
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const result = await apiServer<NotificationStats>('/notifications/stats')
  return result.ok ? result.data : { total: 0, unread: 0 }
}
