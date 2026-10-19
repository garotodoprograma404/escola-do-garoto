'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/shared/hooks/use-toast'
import type { Notification } from '@/shared/types/notifications'
import { openStream } from '../lib/realtime'

interface RealtimeNotificationsProps {
  /** Chamado para cada notificação nova que chega (ex.: atualizar o contador do sino). */
  onNotification?: (notification: Notification) => void
  /** Quando `true`, atualiza a página atual (`router.refresh()`) a cada notificação nova. */
  refreshOnNew?: boolean
}

/**
 * Componente "invisível": acompanha as notificações da pessoa logada por SSE (`/api/notifications/stream`)
 * e mostra um aviso (toast) quando chega uma nova (resposta de ticket, novo ticket para a equipe...).
 * O servidor só envia as notificações DA PRÓPRIA pessoa (o cookie de sessão autentica o stream).
 */
export function RealtimeNotifications({
  onNotification,
  refreshOnNew = false,
}: RealtimeNotificationsProps) {
  const { toast } = useToast()
  const router = useRouter()
  // Guarda os callbacks mais recentes sem reabrir a conexão a cada render.
  const handlers = useRef({ onNotification, refreshOnNew, toast, router })
  useEffect(() => {
    handlers.current = { onNotification, refreshOnNew, toast, router }
  })

  useEffect(() => {
    return openStream('/notifications/stream', {
      events: {
        notifications: (data) => {
          const incoming = Array.isArray(data) ? (data as Notification[]) : []
          for (const notification of incoming) {
            const current = handlers.current
            current.toast({
              title: notification.title,
              description: notification.message,
              action: notification.link ? (
                <a href={notification.link} className="underline">
                  Ver
                </a>
              ) : undefined,
            })
            current.onNotification?.(notification)
          }
          if (incoming.length > 0 && handlers.current.refreshOnNew) {
            handlers.current.router.refresh()
          }
        },
      },
    })
  }, [])

  return null // This is a headless component
}
