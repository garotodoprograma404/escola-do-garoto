// =====================================================
// PRODUCER FINANCIALS - WITHDRAWAL FORM (Client Component)
// =====================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { useToast } from '@/shared/hooks/use-toast'
import { requestWithdrawalAction } from '../actions/request-withdrawal'
import type { WithdrawalRequestClientInput } from '../lib/withdrawal-request-schema'
import { withdrawalRequestClientSchema } from '../lib/withdrawal-request-schema'

type FormData = WithdrawalRequestClientInput

interface WithdrawalFormProps {
  availableBalance: number
  onSuccess: () => void
  accountScope?: 'producer' | 'affiliate'
  revalidatePath?: string
}

export function WithdrawalForm({
  availableBalance,
  onSuccess,
  accountScope = 'producer',
  revalidatePath,
}: WithdrawalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(withdrawalRequestClientSchema),
    defaultValues: {
      method: 'pix',
    },
  })

  const method = watch('method')

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('amount', data.amount.toString())
      formData.append('method', data.method)
      formData.append('account_scope', accountScope)
      if (revalidatePath) {
        formData.append('revalidate_path', revalidatePath)
      }

      if (data.method === 'pix' && data.pix_key) {
        formData.append('pix_key', data.pix_key)
      }

      if (data.method === 'bank_transfer') {
        if (data.bank_code) formData.append('bank_code', data.bank_code)
        if (data.bank_agency) formData.append('bank_agency', data.bank_agency)
        if (data.bank_account) formData.append('bank_account', data.bank_account)
        if (data.account_type) formData.append('account_type', data.account_type)
      }

      const result = await requestWithdrawalAction(formData)

      if (result.success) {
        toast({
          title: 'Solicitação enviada!',
          description: 'Seu saque será processado em até 2 dias úteis.',
        })
        onSuccess()
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Erro ao processar solicitação',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao processar solicitação',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Valor do Saque</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0,00"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-sm text-red-600">{String(errors.amount.message)}</p>}
        <p className="text-xs text-muted-foreground">
          Valor mínimo: R$ 50,00 | Disponível:{' '}
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(availableBalance)}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Método de Saque</Label>
        <RadioGroup defaultValue="pix" {...register('method')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="cursor-pointer font-normal">
              PIX (Instantâneo)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bank_transfer" id="bank_transfer" />
            <Label htmlFor="bank_transfer" className="cursor-pointer font-normal">
              Transferência Bancária (1-2 dias úteis)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {method === 'pix' && (
        <div className="space-y-2">
          <Label htmlFor="pix_key">Chave PIX</Label>
          <Input
            id="pix_key"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            {...register('pix_key')}
          />
          {errors.pix_key && (
            <p className="text-sm text-red-600">{String(errors.pix_key.message)}</p>
          )}
        </div>
      )}

      {method === 'bank_transfer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_code">Banco</Label>
              <Input id="bank_code" placeholder="001" {...register('bank_code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_agency">Agência</Label>
              <Input id="bank_agency" placeholder="0001" {...register('bank_agency')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account">Conta</Label>
            <Input id="bank_account" placeholder="12345-6" {...register('bank_account')} />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Conta</Label>
            <RadioGroup defaultValue="checking" {...register('account_type')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checking" id="checking" />
                <Label htmlFor="checking" className="cursor-pointer font-normal">
                  Conta Corrente
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="savings" id="savings" />
                <Label htmlFor="savings" className="cursor-pointer font-normal">
                  Conta Poupança
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Solicitar Saque
        </Button>
      </div>
    </form>
  )
}
