'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { apiRequest } from '@/lib/api-client'

type Outcome = 'approved' | 'rejected' | 'pending' | 'refunded'

const OUTCOMES: Array<{ outcome: Outcome; label: string; variant: 'default' | 'outline' }> = [
  { outcome: 'approved', label: 'Aprovar pagamento', variant: 'default' },
  { outcome: 'rejected', label: 'Recusar pagamento', variant: 'outline' },
  { outcome: 'pending', label: 'Deixar em análise', variant: 'outline' },
  { outcome: 'refunded', label: 'Estornar (depois de aprovado)', variant: 'outline' },
]

interface CheckoutSimulatorProps {
  orderId: string
}

/**
 * Simulador de pagamento: desenvolvimento sem credenciais do Mercado Pago e ambiente de demonstração. Faz o mesmo
 * caminho do webhook do Mercado Pago, com valor, moeda e referência conferidos pela API.
 */
export function CheckoutSimulator({ orderId }: CheckoutSimulatorProps) {
  const [busy, setBusy] = useState<Outcome | null>(null)
  const [error, setError] = useState<string | null>(null)

  const simulate = async (outcome: Outcome) => {
    setBusy(outcome)
    setError(null)
    const result = await apiRequest(`/dev/payments/${orderId}/simulate`, {
      method: 'POST',
      body: { outcome },
    })
    setBusy(null)

    if (!result.ok) {
      setError(result.error.message)
      return
    }
    window.location.assign(`/checkout/success?order_id=${encodeURIComponent(orderId)}`)
  }

  return (
    <div className="space-y-3">
      {OUTCOMES.map(({ outcome, label, variant }) => (
        <Button
          key={outcome}
          type="button"
          variant={variant}
          className="w-full"
          disabled={busy !== null}
          onClick={() => simulate(outcome)}
        >
          {busy === outcome ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {label}
        </Button>
      ))}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
}
