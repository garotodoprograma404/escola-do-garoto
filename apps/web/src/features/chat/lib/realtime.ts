/**
 * Tempo real por SSE. O navegador abre um `EventSource` no mesmo
 * domínio (`/api/...`): o cookie de sessão vai junto e é ele que autentica. Para ENVIAR usa-se
 * POST/PUT normais (`apiRequest`).
 */

export type StreamHandlers = {
  /** Eventos nomeados do servidor: `message`, `typing`, `ticket`, `notifications`... */
  events: Record<string, (data: unknown) => void>
  onOpen?: () => void
  /** Conexão caiu (o navegador tenta reconectar sozinho) ou foi recusada. */
  onDisconnect?: () => void
}

/** `true` onde existe `EventSource` (navegador). Em testes (jsdom) e no servidor não existe. */
export function supportsEventSource(): boolean {
  return typeof EventSource !== 'undefined'
}

/** Abre o stream e devolve a função que fecha. Sem `EventSource`, não faz nada. */
export function openStream(path: `/${string}`, handlers: StreamHandlers): () => void {
  if (!supportsEventSource()) return () => undefined

  const source = new EventSource(`/api${path}`, { withCredentials: true })
  source.onopen = () => handlers.onOpen?.()
  source.onerror = () => handlers.onDisconnect?.()

  for (const [name, handler] of Object.entries(handlers.events)) {
    source.addEventListener(name, (event) => {
      try {
        handler(JSON.parse((event as MessageEvent<string>).data))
      } catch {
        // Evento malformado: ignora, o próximo segue normalmente.
      }
    })
  }
  // O servidor encerra quando a pessoa perde o acesso: não adianta reconectar.
  source.addEventListener('closed', () => {
    source.close()
    handlers.onDisconnect?.()
  })

  return () => source.close()
}
