import { useCallback, useRef } from 'react'

type AutoFocusHandler = (event: Event) => void

/**
 * Devolve o foco ao elemento que o tinha antes de uma janela (diálogo, confirmação, gaveta) abrir.
 *
 * O Radix só faz isso quando a janela é aberta por um `<DialogTrigger>`. Aqui quase todas abrem por
 * estado (`open`), então ao fechar o foco caía no `<body>` e quem usa teclado ou leitor de tela
 * voltava ao início da página. Repasse os dois handlers ao `Content` da janela.
 */
export function useReturnFocus(handlers: {
  onOpenAutoFocus?: AutoFocusHandler
  onCloseAutoFocus?: AutoFocusHandler
}) {
  const { onOpenAutoFocus, onCloseAutoFocus } = handlers
  const returnTo = useRef<HTMLElement | null>(null)

  const handleOpenAutoFocus = useCallback(
    (event: Event) => {
      // Neste instante o foco ainda está em quem abriu a janela.
      returnTo.current =
        document.activeElement instanceof HTMLElement && document.activeElement !== document.body
          ? document.activeElement
          : null
      onOpenAutoFocus?.(event)
    },
    [onOpenAutoFocus],
  )

  const handleCloseAutoFocus = useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return

      const target = returnTo.current
      returnTo.current = null
      if (target?.isConnected) {
        event.preventDefault()
        target.focus()
      }
    },
    [onCloseAutoFocus],
  )

  return { onOpenAutoFocus: handleOpenAutoFocus, onCloseAutoFocus: handleCloseAutoFocus }
}
