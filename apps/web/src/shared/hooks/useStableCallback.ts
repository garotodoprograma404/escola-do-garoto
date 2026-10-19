import { useCallback, useEffect, useRef } from 'react'

/**
 * Função de identidade estável que sempre chama a versão mais recente de `callback`.
 * Serve para efeitos que avisam o componente pai (`onUpdate`, `onChange`) sem reexecutar
 * toda vez que o pai recria a função, e sem desligar a regra `exhaustive-deps`.
 */
export function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
): (...args: Args) => Result {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback((...args: Args) => callbackRef.current(...args), [])
}
