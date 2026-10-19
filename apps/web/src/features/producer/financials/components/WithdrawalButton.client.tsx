// =====================================================
// PRODUCER FINANCIALS - WITHDRAWAL BUTTON (Client Component)
// =====================================================

'use client'

import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { WithdrawalForm } from './WithdrawalForm.client'

interface WithdrawalButtonProps {
  availableBalance: number
  accountScope?: 'producer' | 'affiliate'
  revalidatePath?: string
}

export function WithdrawalButton({
  availableBalance,
  accountScope = 'producer',
  revalidatePath,
}: WithdrawalButtonProps) {
  const [open, setOpen] = useState(false)

  const canWithdraw = availableBalance >= 50

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canWithdraw} size="lg">
          <DollarSign className="mr-2 h-4 w-4" />
          Solicitar Saque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
          <DialogDescription>
            Saldo disponível:{' '}
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(availableBalance)}
          </DialogDescription>
        </DialogHeader>
        <WithdrawalForm
          availableBalance={availableBalance}
          accountScope={accountScope}
          revalidatePath={revalidatePath}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
