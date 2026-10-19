'use client'

import type { AuthResponse } from '@vox/contracts'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { Button } from '@/shared/components/ui/button'
import { getRoleDashboardPath } from '@/shared/lib/navigation'

type State = { status: 'working' } | { status: 'error'; message: string }

/**
 * Página do link de confirmação de e-mail. O token vem depois do # (não passa por servidor nem log).
 * Confirma a conta, a API já abre a sessão (cookie) e a pessoa vai para o painel dela.
 */
export function VerifyEmailCard() {
  const [state, setState] = useState<State>({ status: 'working' })

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) {
      setState({ status: 'error', message: 'Link de confirmação inválido ou expirado.' })
      return
    }

    void apiRequest<AuthResponse>('/auth/email/verify', { method: 'POST', body: { token } }).then(
      (result) => {
        if (!result.ok) {
          setState({ status: 'error', message: result.error.message })
          return
        }
        const role = result.data.user.roles[0]
        window.location.replace(role ? getRoleDashboardPath(role) : '/student')
      },
    )
  }, [])

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
        <MailCheck size={24} />
      </div>
      {state.status === 'working' ? (
        <>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Confirmando seu e-mail…
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Só um instante.</p>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Não deu certo</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{state.message}</p>
          <Button asChild className="mt-6">
            <Link href="/login">Ir para o login</Link>
          </Button>
        </>
      )}
    </div>
  )
}
