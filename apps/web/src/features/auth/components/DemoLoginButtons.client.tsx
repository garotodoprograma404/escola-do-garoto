'use client'

import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { demoLoginAction } from '../actions/demo-login'
import { DEMO_ROLES, type DemoRole } from '../lib/demo-roles'

/** Entrada rápida do ambiente de demonstração: um clique e a pessoa está dentro do papel. */
export function DemoLoginButtons() {
  const [pending, startTransition] = useTransition()
  const [active, setActive] = useState<DemoRole | null>(null)
  const [error, setError] = useState('')

  function enter(role: DemoRole) {
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
    <section
      aria-labelledby="demo-login-title"
      className="w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <h2
        id="demo-login-title"
        className="text-base font-semibold text-amber-950 dark:text-amber-100"
      >
        Conheça por dentro, sem cadastro
      </h2>
      <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
        Ambiente de demonstração: escolha um perfil e entre com um clique.
      </p>
      <div className="mt-4 space-y-2">
        {DEMO_ROLES.map((item) => (
          <Button
            key={item.role}
            type="button"
            variant="outline"
            className="h-auto w-full justify-between bg-white py-3 text-left dark:bg-slate-900"
            disabled={pending}
            onClick={() => enter(item.role)}
          >
            <span>
              <span className="block font-semibold">
                {active === item.role ? 'Entrando...' : item.label}
              </span>
              <span className="block text-xs font-normal text-slate-600 dark:text-slate-400">
                {item.hint}
              </span>
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  )
}
