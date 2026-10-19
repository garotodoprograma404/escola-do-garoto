'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/**
 * `true` quando o tema escuro está ativo. No servidor (e na primeira renderização do navegador)
 * devolve `false`, para o HTML bater com o que o servidor gerou e não dar erro de hidratação:
 * o `next-themes` só conhece o tema depois que roda no navegador.
 */
export function useIsDarkTheme() {
  const { theme } = useTheme()
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  return hydrated && theme === 'dark'
}
