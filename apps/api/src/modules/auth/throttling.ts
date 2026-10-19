import { createHash, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import type { ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard, type ThrottlerOptions } from '@nestjs/throttler'
import { SESSION_COOKIE_NAME } from '@vox/contracts'
import type { Request } from 'express'

/**
 * Chave do limite por IP. O `req.ip` do Express devolve qualquer texto que o cliente mande em
 * `X-Forwarded-For`; se não for um IP válido, usamos o endereço real da conexão. Assim lixo no
 * cabeçalho nunca cria balde novo nem entra no banco/log.
 */
export function clientIp(req: Pick<Request, 'ip' | 'socket'>): string | undefined {
  if (req.ip && isIP(req.ip)) return req.ip
  return req.socket?.remoteAddress
}

/**
 * IPv4 vale um por um. IPv6 é agrupado por /64 (a menor rede que um provedor entrega a um
 * cliente): senão uma única casa teria 2^64 endereços, ou seja, 2^64 baldes de limite.
 */
export function throttleKey(ip: string): string {
  // IPv4 escrito como IPv6 (::ffff:1.2.3.4) é o mesmo IPv4.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (mapped) return mapped[1]
  if (isIP(ip) !== 6) return ip

  const [head = '', tail = ''] = ip.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = ip.includes('::') ? 8 - headGroups.length - tailGroups.length : 0
  const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups]
  return `${groups
    .slice(0, 4)
    .map((group) => group.toLowerCase().padStart(4, '0'))
    .join(':')}::/64`
}

export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return throttleKey(clientIp(req as unknown as Request) ?? 'unknown')
  }
}

const INTERNAL_KEY_HEADER = 'x-internal-key'

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/**
 * Chamada do servidor do Next (renderização de páginas) com a chave interna.
 * Sem isso, todas as páginas chegariam de um IP só (o do Next) e UM visitante gastaria o limite
 * de todo o site. Por isso o limite por IP (`default`) pula essas chamadas; quem limita o visitante
 * nelas é o throttler `visitor`, pelo IP que o Next repassa (ver `visitorThrottler`).
 */
export function isInternalCall(
  req: Pick<Request, 'headers'>,
  expectedKey: string | undefined,
): boolean {
  if (!expectedKey) return false
  const sent = req.headers[INTERNAL_KEY_HEADER]
  if (typeof sent !== 'string') return false
  return timingSafeEqual(digest(sent), digest(expectedKey))
}

/** Regra de "não limitar" compartilhada por todos os throttlers. */
export function shouldSkipThrottle(
  context: ExecutionContext,
  options: { enabled: boolean; internalKey: string | undefined },
): boolean {
  if (!options.enabled) return true
  return isInternalCall(context.switchToHttp().getRequest<Request>(), options.internalKey)
}

/** E-mail do corpo da requisição, normalizado como no cadastro. `undefined` se não houver. */
export function emailFromBody(req: Pick<Request, 'body'>): string | undefined {
  const email: unknown = (req.body as { email?: unknown } | undefined)?.email
  if (typeof email !== 'string') return undefined
  const normalized = email.trim().toLowerCase().slice(0, 254)
  return normalized.length > 0 ? normalized : undefined
}

function bodyEmail(context: ExecutionContext): string | undefined {
  return emailFromBody(context.switchToHttp().getRequest<Request>())
}

/** Cabeçalho com o IP de quem está navegando, que o servidor do Next repassa à API. */
const VISITOR_IP_HEADER = 'x-vox-client-ip'

/**
 * IP do visitante repassado pelo Next. Só vale junto com a chave interna (ninguém de fora consegue
 * escolher o próprio IP) e só se for um IP válido.
 */
function forwardedVisitorIp(
  req: Pick<Request, 'headers'>,
  internalKey: string | undefined,
): string | undefined {
  if (!isInternalCall(req, internalKey)) return undefined
  const value = req.headers[VISITOR_IP_HEADER]
  return typeof value === 'string' && isIP(value.trim()) ? value.trim() : undefined
}

const VISITOR_THROTTLER = 'visitor'

/**
 * Limite POR VISITANTE nas chamadas do Next (Server Actions e páginas), pelo IP que ele repassa.
 * Teto alto por padrão (uma página faz várias chamadas); as rotas de autenticação apertam com o
 * mesmo número do limite por IP (`RATE_LIMITS`). Sem isso, o login pelo site não teria limite
 * por IP, porque o `default` pula as chamadas com chave interna.
 */
export function visitorThrottler(
  enabled: boolean,
  internalKey: string | undefined,
): ThrottlerOptions {
  return {
    name: VISITOR_THROTTLER,
    ttl: 60_000,
    limit: 600,
    skipIf: (context) =>
      !enabled ||
      forwardedVisitorIp(context.switchToHttp().getRequest<Request>(), internalKey) === undefined,
    getTracker: (req) =>
      `visitor:${throttleKey(forwardedVisitorIp(req as Pick<Request, 'headers'>, internalKey) ?? 'unknown')}`,
  }
}

const ACCOUNT_THROTTLER = 'account'

/**
 * Limite por conta (e-mail), somado ao limite por IP: segura quem troca de IP para tentar
 * senhas de uma mesma conta, ou para lotar a caixa de e-mail de alguém. NÃO é pulado pela chave
 * interna: o login pelo site passa pelo Next e continua limitado por e-mail.
 */
export function accountThrottler(skip: (context: ExecutionContext) => boolean): ThrottlerOptions {
  return {
    name: ACCOUNT_THROTTLER,
    ttl: 60_000,
    limit: 5,
    skipIf: (context) => skip(context) || bodyEmail(context) === undefined,
    getTracker: (req) => emailFromBody(req as Pick<Request, 'body'>) ?? 'sem-email',
  }
}

export const SESSION_THROTTLER = 'session'

function sessionCookie(req: Pick<Request, 'cookies'>): string | undefined {
  const value: unknown = req.cookies?.[SESSION_COOKIE_NAME]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Limite POR SESSÃO (por pessoa logada), somado ao de IP. Diferente dos outros, este NÃO é pulado
 * pela chave interna do Next: as chamadas do servidor do Next carregam o cookie de quem está
 * navegando, então cada pessoa continua tendo o próprio teto mesmo quando todas chegam do mesmo
 * IP. É ele que segura quem tenta adivinhar cupom pela página de checkout.
 *
 * Só conta quem tem cookie de sessão (rotas públicas sem login ficam de fora). A chave é o hash do
 * cookie: o valor real nunca fica guardado na memória do limitador.
 */
export function sessionThrottler(enabled: boolean): ThrottlerOptions {
  return {
    name: SESSION_THROTTLER,
    ttl: 60_000,
    limit: 300,
    skipIf: (context) =>
      !enabled || sessionCookie(context.switchToHttp().getRequest<Request>()) === undefined,
    getTracker: (req) =>
      `session:${digest(sessionCookie(req as Pick<Request, 'cookies'>) ?? '').toString('hex')}`,
  }
}
