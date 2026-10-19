'use client'

import { useState, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Send } from 'lucide-react'
import { sendMessage } from '../actions/ticket-actions'

interface SendMessageFormProps {
  ticketId: string
  isTicketClosed: boolean
}

export function SendMessageForm({ ticketId, isTicketClosed }: SendMessageFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await sendMessage(formData)

    if (result.success) {
      setMessage('')
      formRef.current?.reset()
    } else {
      setError(result.error || 'Erro ao enviar mensagem')
    }

    setIsLoading(false)
  }

  if (isTicketClosed) {
    return (
      <div className="rounded-md bg-gray-50 p-4 text-center text-sm text-muted-foreground">
        Este ticket está fechado. Não é possível enviar novas mensagens.
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="ticket_id" value={ticketId} />

      <div className="space-y-2">
        <Textarea
          name="message"
          placeholder="Digite sua mensagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          disabled={isLoading}
        />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !message.trim()} className="w-full sm:w-auto">
          <Send className="mr-2 h-4 w-4" />
          {isLoading ? 'Enviando...' : 'Enviar Mensagem'}
        </Button>
      </div>
    </form>
  )
}
