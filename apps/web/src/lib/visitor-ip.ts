import { isIP } from 'node:net'

/**
 * IP de quem está navegando, a partir do `X-Forwarded-For` que o proxy (Caddy/Traefik) define. Vale
 * o ÚLTIMO da lista (o que o proxy da frente acrescentou); o resto o visitante pode inventar.
 * Vai para a API no cabeçalho `x-vox-client-ip`, que ela só aceita junto com a chave interna.
 */
export function visitorIpFrom(forwardedFor: string | null | undefined): string | undefined {
  const last = forwardedFor?.split(',').at(-1)?.trim()
  return last && isIP(last) ? last : undefined
}
