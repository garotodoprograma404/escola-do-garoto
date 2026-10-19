'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { finalizeCheckoutAccountAction } from '@/features/public/checkout/actions/finalize-checkout-account'

interface FinalizeAccountFormProps {
  orderId: string
  buyerEmail: string
  buyerName: string
}

export function FinalizeAccountForm({ orderId, buyerEmail, buyerName }: FinalizeAccountFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (password.length < 8) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.')
      return
    }

    startTransition(async () => {
      const result = await finalizeCheckoutAccountAction({
        orderId,
        password,
      })

      if (!result.success) {
        setErrorMessage(result.message)
        if (result.redirect_url) {
          window.setTimeout(() => window.location.assign(result.redirect_url as string), 2500)
        }
        return
      }

      // A conta só entra depois que o dono do e-mail abre o link de confirmação: avisa antes de ir.
      setSuccessMessage(result.message)
      window.setTimeout(() => window.location.assign(result.redirect_url || '/login'), 3500)
    })
  }

  return (
    <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-50/60 p-5 text-left dark:bg-amber-950/20">
      <h3 className="text-base font-semibold">Pagamento aprovado. Finalize sua conta.</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Olá, <strong>{buyerName}</strong>. Defina sua senha para acessar a plataforma com o e-mail{' '}
        <strong>{buyerEmail}</strong>.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="space-y-2">
          <Label htmlFor="checkout-password">Crie sua senha</Label>
          <Input
            id="checkout-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-confirm-password">Confirme sua senha</Label>
          <Input
            id="checkout-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repita a senha"
            minLength={8}
            autoComplete="new-password"
            disabled={isPending}
          />
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
        {successMessage && (
          <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        )}

        <Button type="submit" disabled={isPending || successMessage !== null} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizando conta...
            </>
          ) : (
            'Criar minha conta'
          )}
        </Button>
      </form>
    </div>
  )
}
