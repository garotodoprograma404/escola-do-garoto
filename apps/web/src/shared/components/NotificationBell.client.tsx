'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react'
import { markAsRead, markAllAsRead, deleteNotification } from '../actions/notification-actions'
import type { Notification } from '../types/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface NotificationBellProps {
  notifications: Notification[]
  unreadCount: number
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

export function NotificationBell({ notifications, unreadCount }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)

  async function handleMarkAsRead(notificationId: string) {
    await markAsRead(notificationId)
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead()
  }

  async function handleDelete(notificationId: string) {
    await deleteNotification(notificationId)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {/* O nome vem do texto (e não de aria-label): assim o número do selo, que é visível, faz parte dele. */}
          <span className="sr-only">
            Abrir notificações
            {unreadCount > 0
              ? `, ${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}`
              : ''}
          </span>
          {unreadCount > 0 && (
            <Badge
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer flex-col items-start gap-1 p-3 ${!notification.read ? 'bg-muted/50' : ''}`}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification.id)
                  }
                  if (notification.link) {
                    setIsOpen(false)
                  }
                }}
                asChild={!!notification.link}
              >
                {notification.link ? (
                  <Link href={notification.link} className="w-full">
                    <div className="flex w-full items-start gap-2">
                      <span className="flex-shrink-0 text-lg">
                        {notificationIcons[notification.type] || '📢'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            aria-label={`Marcar notificação ${notification.id} como lida`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={`Excluir notificação ${notification.id}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex w-full items-start gap-2">
                    <span className="flex-shrink-0 text-lg">
                      {notificationIcons[notification.type] || '📢'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={`Marcar notificação ${notification.id} como lida`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label={`Excluir notificação ${notification.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="w-full text-center text-sm">
                Ver todas as notificações
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
