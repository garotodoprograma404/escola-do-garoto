'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useToast } from '@/shared/hooks/use-toast'
import type { TicketStatus } from '../types'
import { updateTicketStatusAction } from '../actions/ticket-actions'

interface TicketStatusControlProps {
  ticketId: string
  currentStatus: TicketStatus
}

const statusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'waiting_customer', label: 'Aguardando Cliente' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
]

export function TicketStatusControl({ ticketId, currentStatus }: TicketStatusControlProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(currentStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setSelectedStatus(currentStatus)
  }, [currentStatus])

  async function handleUpdateStatus() {
    if (selectedStatus === currentStatus || isSubmitting) return

    setIsSubmitting(true)
    try {
      const result = await updateTicketStatusAction(ticketId, selectedStatus)
      if (!result.success) {
        toast({
          title: 'Erro ao atualizar status',
          description: result.error || 'Não foi possível atualizar o ticket.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Status atualizado',
        description: 'O status do ticket foi atualizado com sucesso.',
      })
      router.refresh()
    } catch {
      toast({
        title: 'Erro ao atualizar status',
        description: 'Não foi possível atualizar o ticket.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges = selectedStatus !== currentStatus

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Select
        value={selectedStatus}
        onValueChange={(value) => setSelectedStatus(value as TicketStatus)}
        disabled={isSubmitting}
      >
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Selecione o status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        onClick={handleUpdateStatus}
        disabled={!hasChanges || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Atualizando...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Status
          </>
        )}
      </Button>
    </div>
  )
}
