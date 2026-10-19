'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { apiRequest } from '@/lib/api-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ChatMessage, TypingIndicator } from '../types'
import { openStream } from '../lib/realtime'

/** "Digitando" some sozinho se o aviso de parada se perder (aba fechada, rede caiu). */
const TYPING_EXPIRES_MS = 6000
/** O aviso de digitação vai ao servidor no máximo uma vez neste intervalo. */
const TYPING_SEND_INTERVAL_MS = 2000
/** Sem o stream de tempo real, volta a consultar a conversa neste intervalo. */
const FALLBACK_POLL_MS = 3000

interface ChatMessageWithSender extends ChatMessage {
  sender?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface TicketStateEvent {
  status: string
}

interface ChatBoxProps {
  ticketId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string | null
  /** Só deixa a tela mais clara: quem é "Suporte" de verdade é decidido pelo servidor. */
  isStaff?: boolean
  isTicketClosed?: boolean
}

function mergeMessages(
  current: ChatMessageWithSender[],
  incoming: ChatMessageWithSender[],
): ChatMessageWithSender[] {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id,
  )
}

export function ChatBox({
  ticketId,
  currentUserId,
  isStaff = false,
  isTicketClosed = false,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRealtimeSubscribed, setIsRealtimeSubscribed] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [sendError, setSendError] = useState<string | null>(null)
  const [ticketClosed, setTicketClosed] = useState(isTicketClosed)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingExpiryRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const lastTypingSentRef = useRef(0)
  const isTypingRef = useRef(false)
  const normalizedTicketId = useMemo(() => {
    const parsedId = Number(ticketId)
    return Number.isFinite(parsedId) ? parsedId : ticketId
  }, [ticketId])
  const basePath = `/chat/tickets/${normalizedTicketId}` as const

  useEffect(() => {
    setTicketClosed(isTicketClosed)
  }, [isTicketClosed])

  const loadMessages = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true)
      }

      const result = await apiRequest<ChatMessageWithSender[]>(`${basePath}/messages`)
      if (result.ok) {
        setMessages((current) => mergeMessages(current, result.data))
      }

      if (!silent) {
        setIsLoading(false)
      }
    },
    [basePath],
  )

  // Load initial messages
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Tempo real: o servidor EMPURRA mensagens novas, "digitando" e mudança de status (SSE).
  useEffect(() => {
    const expiry = typingExpiryRef.current

    const removeTyping = (userId: string) => {
      const timer = expiry.get(userId)
      if (timer) clearTimeout(timer)
      expiry.delete(userId)
      setTypingUsers((prev) => prev.filter((t) => t.user_id !== userId))
    }

    const close = openStream(`${basePath}/stream`, {
      events: {
        message: (data) => {
          const message = data as ChatMessageWithSender
          setMessages((current) => mergeMessages(current, [message]))
          // Quem escreveu parou de "digitar".
          removeTyping(message.sender_id)
        },
        typing: (data) => {
          const indicator = data as TypingIndicator
          if (indicator.user_id === currentUserId) return
          if (!indicator.is_typing) {
            removeTyping(indicator.user_id)
            return
          }
          setTypingUsers((prev) => [
            ...prev.filter((t) => t.user_id !== indicator.user_id),
            indicator,
          ])
          const previous = expiry.get(indicator.user_id)
          if (previous) clearTimeout(previous)
          expiry.set(
            indicator.user_id,
            setTimeout(() => removeTyping(indicator.user_id), TYPING_EXPIRES_MS),
          )
        },
        ticket: (data) => {
          if ((data as TicketStateEvent).status === 'closed') setTicketClosed(true)
        },
      },
      onOpen: () => {
        setIsRealtimeSubscribed(true)
        // Pode ter chegado mensagem enquanto a conexão estava fora.
        void loadMessages({ silent: true })
      },
      onDisconnect: () => setIsRealtimeSubscribed(false),
    })

    return () => {
      setIsRealtimeSubscribed(false)
      close()
      for (const timer of expiry.values()) clearTimeout(timer)
      expiry.clear()
    }
  }, [basePath, currentUserId, loadMessages])

  // Fallback for environments where realtime stream is temporarily unavailable.
  useEffect(() => {
    if (isRealtimeSubscribed) return

    const intervalId = setInterval(() => {
      void loadMessages({ silent: true })
    }, FALLBACK_POLL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [isRealtimeSubscribed, loadMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  const updateTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      if (ticketClosed) return
      // Só avisa quando muda de estado ou de tempos em tempos (não a cada tecla).
      const now = Date.now()
      if (
        isTyping &&
        isTypingRef.current &&
        now - lastTypingSentRef.current < TYPING_SEND_INTERVAL_MS
      ) {
        return
      }
      if (!isTyping && !isTypingRef.current) return

      isTypingRef.current = isTyping
      lastTypingSentRef.current = now
      await apiRequest<void>(`${basePath}/typing`, { method: 'PUT', body: { isTyping } })
    },
    [basePath, ticketClosed],
  )

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ticketClosed) return
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setSendError(null)
    const messageText = newMessage.trim()
    setNewMessage('')

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    await updateTypingIndicator(false)

    // Quem manda é a pessoa da sessão e "Suporte" depende do papel dela no servidor.
    const result = await apiRequest<ChatMessageWithSender>(`${basePath}/messages`, {
      method: 'POST',
      body: { message: messageText },
    })

    if (!result.ok) {
      setNewMessage(messageText) // Restore message on error
      setSendError(result.error.message)
      if (result.error.statusCode === 409) setTicketClosed(true)
    } else {
      setMessages((current) => mergeMessages(current, [result.data]))
    }

    setIsSending(false)
  }

  const handleTyping = (value: string) => {
    if (ticketClosed) return
    setNewMessage(value)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Update typing indicator
    if (value.trim()) {
      void updateTypingIndicator(true)

      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        void updateTypingIndicator(false)
      }, 3000)
    } else {
      void updateTypingIndicator(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border">
      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId
            const sender = message.sender

            return (
              <div
                key={message.id}
                className={cn('flex gap-3', isOwnMessage && 'flex-row-reverse')}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={sender?.avatar_url || undefined} />
                  <AvatarFallback>
                    {sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className={cn('flex flex-col gap-1', isOwnMessage && 'items-end')}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {!isOwnMessage && <span className="font-medium">{sender?.full_name}</span>}
                    {message.is_staff && (
                      <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        Suporte
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'max-w-md break-words rounded-lg px-4 py-2',
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {message.message}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex gap-3">
              <div className="h-8 w-8" /> {/* Spacer for avatar */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
                    •
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
                    •
                  </span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
                    •
                  </span>
                </div>
                <span>digitando...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        {ticketClosed ? (
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Este ticket está fechado e não aceita novas mensagens.
            </p>
            {!isStaff && (
              <Button asChild variant="outline" size="sm">
                <Link href="/student/support/new">Abrir novo ticket</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={isSending}
                maxLength={4000}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                size="icon"
                aria-label="Enviar mensagem"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
          </div>
        )}
      </form>
    </div>
  )
}
