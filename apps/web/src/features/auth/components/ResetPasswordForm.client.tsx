'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { resetPasswordAction } from '../actions/reset-password'

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')

  // O link do e-mail traz o token depois do # (o fragmento nunca vai para servidor nem para log).
  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const result = await resetPasswordAction(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          <Lock size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Redefinir Senha</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Digite sua nova senha abaixo</p>
      </div>

      <form
        onSubmit={(event) => {
          // Sem `action=`: o React 19 limparia os campos depois de um erro e a pessoa perderia o que digitou.
          event.preventDefault()
          void handleSubmit(new FormData(event.currentTarget))
        }}
        className="space-y-6"
      >
        <input type="hidden" name="token" value={token} />
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="password">Nova Senha</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              required
              minLength={8}
            />
            <Lock className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
          <div className="relative mt-1">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              required
              minLength={8}
            />
            <Lock className="absolute left-3 top-3 text-slate-600 dark:text-slate-400" size={18} />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-500 font-bold text-black hover:bg-brand-400"
        >
          {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
        </Button>
      </form>
    </div>
  )
}
