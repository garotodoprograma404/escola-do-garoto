'use client'

import { useState, useTransition } from 'react'
import { demoLoginAction } from '../actions/demo-login'
import { DEMO_ROLES, type DemoRole } from '../lib/demo-roles'

/**
 * "Ver como": troca de perfil em um clique na faixa do ambiente de demonstração. A API encerra a
 * sessão anterior deste navegador ao entrar no novo perfil, então não precisa sair antes.
 */
export function DemoRoleSwitch() {
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<DemoRole | null>(null)
  const [error, setError] = useState('')

  function switchTo(role: DemoRole) {
    setActive(role)
    setError('')
    startTransition(async () => {
      const result = await demoLoginAction(role)
      if (result?.error) {
        setError(result.error)
        setActive(null)
      }
    })
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold">Ver como:</span>
      {DEMO_ROLES.map((item) => (
        <button
          key={item.role}
          type="button"
          disabled={pending}
          onClick={() => switchTo(item.role)}
          aria-label={item.label}
          className="rounded-full border border-amber-700/40 px-2 py-0.5 font-medium hover:bg-amber-200 disabled:opacity-60 dark:border-amber-300/40 dark:hover:bg-amber-900"
        >
          {active === item.role ? 'Entrando...' : item.short}
        </button>
      ))}
      {error ? (
        <span role="alert" className="text-red-800 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </span>
  )
}
