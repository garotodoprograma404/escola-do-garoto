import type { MessageEvent } from '@nestjs/common'
import { Observable, type Subscription } from 'rxjs'

const HEARTBEAT_MS = 25_000
const ALIVE_CHECK_MS = 30_000

export type SseOptions = {
  /** Eventos de domínio já convertidos em `MessageEvent` (ou `null` para ignorar). */
  source: Observable<MessageEvent | null>
  /** Eventos enviados logo ao conectar (confirmação de que o stream está de pé). */
  initial?: MessageEvent[]
  /**
   * Chamada a cada ~30 s: `false` encerra o stream. É assim que sessão revogada, conta suspensa
   * ou acesso perdido ao ticket derrubam uma conexão que já estava aberta.
   */
  stillAllowed: () => Promise<boolean>
  /** Chamada a cada batimento (mantém a presença "online"). */
  onBeat?: () => void
  /** Chamada ao começar a transmitir (o cliente de fato se inscreveu). */
  onOpen?: () => void
  /** Chamada uma única vez ao encerrar (cliente fechou ou servidor encerrou). */
  onClose?: () => void
  /** Intervalos (só os testes mexem). */
  heartbeatMs?: number
  aliveCheckMs?: number
}

/**
 * Monta o stream SSE: eventos, batimento a cada 25 s (mantém proxies abertos) e revalidação de
 * acesso. Quando o servidor encerra, o `EventSource` tenta reconectar; a API responde 401/403 e o
 * navegador desiste (resposta que não é 200 não reconecta).
 */
export function buildSse(options: SseOptions): Observable<MessageEvent> {
  return new Observable<MessageEvent>((subscriber) => {
    let closed = false
    let source: Subscription | undefined
    options.onOpen?.()

    const heartbeat = setInterval(() => {
      options.onBeat?.()
      subscriber.next({ type: 'ping', data: { at: new Date().toISOString() } })
    }, options.heartbeatMs ?? HEARTBEAT_MS)

    const alive = setInterval(() => {
      options
        .stillAllowed()
        .then((allowed) => {
          if (!allowed && !closed) {
            subscriber.next({ type: 'closed', data: { reason: 'access_revoked' } })
            subscriber.complete()
          }
        })
        .catch(() => undefined)
    }, options.aliveCheckMs ?? ALIVE_CHECK_MS)

    for (const event of options.initial ?? []) subscriber.next(event)
    source = options.source.subscribe({
      next: (event) => {
        if (event) subscriber.next(event)
      },
      error: (error: unknown) => subscriber.error(error),
    })

    return () => {
      if (closed) return
      closed = true
      clearInterval(heartbeat)
      clearInterval(alive)
      source?.unsubscribe()
      options.onClose?.()
    }
  })
}

/**
 * Reserva de conexão que se desfaz sozinha se o stream nunca começar (cliente que desiste durante
 * a validação: o Nest nem inscreve o Observable e o `onClose` jamais rodaria, vazando o contador).
 */
export function leaseUntilSubscribed(release: () => void, graceMs = 15_000) {
  const timer = setTimeout(release, graceMs)
  timer.unref()
  return { onOpen: () => clearTimeout(timer), onClose: release }
}
