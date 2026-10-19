'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  /** Fim do prazo para pedir (ISO), vindo da API. */
  deadline: string
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function RefundButton({ transactionId, courseTitle, deadline }: RefundButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const result = await requestRefund(new FormData(e.currentTarget))
    setIsLoading(false)
    if (!result.success) {
      setError(result.error || 'Erro ao solicitar reembolso')
      return
    }
    setOpen(false)
    // A compra passa a mostrar o andamento do pedido.
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
          <RefreshCw aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
          Pedir reembolso
          <span className="ml-1 font-normal text-slate-600 dark:text-slate-400">
            até {formatDeadline(deadline)}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Pedir reembolso</DialogTitle>
            <DialogDescription>
              Compra: <strong>{courseTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <input type="hidden" name="transaction_id" value={transactionId} />

            <div className="space-y-2">
              <Label htmlFor={`refund-reason-${transactionId}`}>Motivo do reembolso</Label>
              <Textarea
                id={`refund-reason-${transactionId}`}
                name="reason"
                placeholder="Conte para a gente o que aconteceu..."
                required
                minLength={10}
                maxLength={1000}
                rows={4}
              />
              <p className="text-sm text-slate-600 dark:text-slate-400">Mínimo de 10 caracteres</p>
            </div>

            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="mb-1 font-semibold">Como funciona</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Você pode pedir até 7 dias depois da compra (direito de arrependimento).</li>
                <li>A equipe analisa e você recebe o aviso no sino.</li>
                <li>
                  Aprovado, o valor volta pelo mesmo meio de pagamento e o acesso ao curso é
                  encerrado.
                </li>
              </ul>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
              >
                {error}
              </p>
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
              {isLoading ? 'Enviando...' : 'Enviar pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
