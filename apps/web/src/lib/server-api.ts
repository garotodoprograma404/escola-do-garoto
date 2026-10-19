import 'server-only'
import type { ApiErrorBody } from '@vox/contracts'
import { SESSION_COOKIE_NAME } from './session-cookie'
import { cookies, headers as requestHeaders } from 'next/headers'
import { visitorIpFrom } from './visitor-ip'
import type { ApiResult } from './api-client'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3333'

const NETWORK_ERROR: ApiErrorBody = {
  statusCode: 0,
  message: 'Não foi possível falar com o servidor. Tente novamente em instantes.',
}

type ServerApiInit = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Corpo JSON. Para upload use `formData`. */
  body?: unknown
  formData?: FormData
  /** Vira `?a=1&b=2` (valores `undefined`/`null` são ignorados). */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Repassa para o navegador o `Set-Cookie` da resposta (login, logout, confirmar e-mail). */
  forwardCookies?: boolean
}

function buildQuery(query: ServerApiInit['query']): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** Lê um `Set-Cookie` e devolve nome, valor e opções no formato do `cookies().set` do Next. */
function parseSetCookie(header: string) {
  const [pair, ...attributes] = header.split(';').map((part) => part.trim())
  const separator = pair.indexOf('=')
  const name = pair.slice(0, separator)
  const value = decodeURIComponent(pair.slice(separator + 1))
  const options: {
    path?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
    maxAge?: number
    expires?: Date
  } = {}
  for (const attribute of attributes) {
    const [rawKey, rawValue] = attribute.split('=')
    const key = rawKey.toLowerCase()
    if (key === 'path') options.path = rawValue
    else if (key === 'httponly') options.httpOnly = true
    else if (key === 'secure') options.secure = true
    else if (key === 'samesite')
      options.sameSite = rawValue.toLowerCase() as 'lax' | 'strict' | 'none'
    else if (key === 'max-age') options.maxAge = Number(rawValue)
    else if (key === 'expires') options.expires = new Date(rawValue)
  }
  return { name, value, options }
}

/**
 * Chamada à API feita pelo servidor do Next (Server Components, Server Actions, Route Handlers).
 * Leva junto o cookie de sessão de quem está navegando e a chave interna. Nunca lança: devolve ok/erro.
 */
export async function apiServer<T = unknown>(
  path: `/${string}`,
  init: ServerApiInit = {},
): Promise<ApiResult<T>> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value

  const headers: Record<string, string> = {}
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey) {
    headers['x-internal-key'] = internalKey
    // IP de quem navega: a API limita tentativas de login/cadastro por visitante mesmo vindo do Next.
    const visitorIp = visitorIpFrom((await requestHeaders()).get('x-forwarded-for'))
    if (visitorIp) headers['x-vox-client-ip'] = visitorIp
  }
  if (session) headers.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(session)}`
  if (init.body !== undefined) headers['content-type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_URL}/api${path}${buildQuery(init.query)}`, {
      method: init.method ?? (init.body !== undefined || init.formData ? 'POST' : 'GET'),
      headers,
      body: init.formData ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
      cache: 'no-store',
    })
  } catch {
    return { ok: false, error: NETWORK_ERROR }
  }

  if (init.forwardCookies) {
    for (const header of response.headers.getSetCookie()) {
      const { name, value, options } = parseSetCookie(header)
      cookieStore.set(name, value, options)
    }
  }

  const payload: unknown =
    response.status === 204 ? undefined : await response.json().catch(() => undefined)
  if (response.ok) return { ok: true, data: payload as T }

  const body = payload as Partial<ApiErrorBody> | undefined
  return {
    ok: false,
    error: {
      statusCode: response.status,
      message: typeof body?.message === 'string' ? body.message : 'Algo deu errado. Tente de novo.',
      code: typeof body?.code === 'string' ? body.code : undefined,
      issues: body?.issues,
    },
  }
}
