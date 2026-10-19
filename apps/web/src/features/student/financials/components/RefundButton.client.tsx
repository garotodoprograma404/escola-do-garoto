'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { RefreshCw } from 'lucide-react'
import { requestRefund } from '../actions/refund-actions'

interface RefundButtonProps {
  transactionId: string
  courseTitle: string
}

export function RefundButton({ transactionId, courseTitle }: RefundButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await requestRefund(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Reembolso solicitado com sucesso!' })
      setTimeout(() => {
        setOpen(false)
        setMessage(null)
      }, 2000)
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao solicitar reembolso' })
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Solicitar Reembolso</DialogTitle>
            <DialogDescription>
              Você está solicitando reembolso para: <strong>{courseTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <input type="hidden" name="transaction_id" value={transactionId} />

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do Reembolso *</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Por favor, explique o motivo do reembolso..."
                required
                minLength={10}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">Mínimo de 10 caracteres</p>
            </div>

            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="mb-1 font-semibold">Política de Reembolso:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Reembolsos são processados em até 7 dias úteis</li>
                <li>Prazo máximo: 30 dias após a compra</li>
                <li>O valor será devolvido no método de pagamento original</li>
              </ul>
            </div>

            {message && (
              <div
                className={`rounded-md p-3 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Solicitando...' : 'Solicitar Reembolso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
