'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { CheckCircle } from 'lucide-react'
import { closeTicket } from '../actions/ticket-actions'

interface CloseTicketButtonProps {
  ticketId: string
}

export function CloseTicketButton({ ticketId }: CloseTicketButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClose() {
    setIsLoading(true)
    setError(null)

    const result = await closeTicket(ticketId)

    if (!result.success) {
      setError(result.error || 'Erro ao fechar ticket')
    }

    setIsLoading(false)
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">
            <CheckCircle className="mr-2 h-4 w-4" />
            Fechar Ticket
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar este ticket? Você não poderá enviar novas mensagens após
              fechar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isLoading}>
              {isLoading ? 'Fechando...' : 'Fechar Ticket'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </>
  )
}
