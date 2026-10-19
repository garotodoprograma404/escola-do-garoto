import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { getNotifications, getNotificationStats } from '@/shared/services/notificationService'
import {
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '@/shared/actions/notification-actions'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const metadata = {
  title: 'Notificações',
  description: 'Central de notificações',
}

const notificationIcons: Record<string, string> = {
  course_update: '📚',
  new_content: '✨',
  enrollment: '🎓',
  completion: '🎉',
  certificate: '🏆',
  message: '💬',
  review: '⭐',
  payment: '💳',
  refund: '💰',
  support: '🎧',
  system: '⚙️',
}

async function NotificationsContent() {
  const [notifications, stats] = await Promise.all([getNotifications(), getNotificationStats()])

  async function handleMarkAsRead(notificationId: string) {
    'use server'
    await markAsRead(notificationId)
  }

  async function handleMarkAllAsRead() {
    'use server'
    await markAllAsRead()
  }

  async function handleDelete(notificationId: string) {
    'use server'
    await deleteNotification(notificationId)
  }

  async function handleDeleteAllRead() {
    'use server'
    await deleteAllRead()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            {stats.unread > 0
              ? `${stats.unread} não lida${stats.unread > 1 ? 's' : ''}`
              : 'Todas as notificações lidas'}
          </p>
        </div>
        <div className="flex gap-2">
          {stats.unread > 0 && (
            <form action={handleMarkAllAsRead}>
              <Button type="submit" variant="outline">
                <CheckCheck className="mr-2 h-4 w-4" />
                Marcar todas como lidas
              </Button>
            </form>
          )}
          {notifications.some((n) => n.read) && (
            <form action={handleDeleteAllRead}>
              <Button type="submit" variant="outline">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar lidas
              </Button>
            </form>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhuma notificação</h3>
            <p className="text-muted-foreground">Você não tem notificações no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={!notification.read ? 'border-l-4 border-l-primary' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 text-2xl">
                    {notificationIcons[notification.type] || '📢'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 gap-1">
                        {!notification.read && (
                          <form action={handleMarkAsRead.bind(null, notification.id)}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              title="Marcar como lida"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                        <form action={handleDelete.bind(null, notification.id)}>
                          <Button type="submit" variant="ghost" size="icon" title="Deletar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>

                    {notification.link && (
                      <Link href={notification.link}>
                        <Button variant="link" className="mt-2 h-auto p-0">
                          Ver detalhes →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  )
}
