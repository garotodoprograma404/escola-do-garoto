import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import type { TicketMessage } from '../types'

interface TicketMessagesProps {
  messages: TicketMessage[]
}

export function TicketMessages({ messages }: TicketMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Nenhuma mensagem ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const initials = message.user_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <div key={message.id} className="flex gap-2.5 sm:gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={message.user_avatar || undefined} alt={message.user_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold sm:text-base">{message.user_name}</span>
                {message.is_staff && (
                  <Badge variant="secondary" className="text-xs">
                    Suporte
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="whitespace-pre-wrap text-sm">{message.message}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
