import type { ApiErrorBody } from '@vox/contracts'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody }

const NETWORK_ERROR: ApiErrorBody = {
  statusCode: 0,
  message: 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
}

/**
 * Chamada à API feita pelo navegador. Vai para `/api/...` no mesmo domínio (o Next repassa para
 * o Nest), então o cookie de sessão segue junto sem CORS. Nunca lança: devolve ok/erro.
 */
export async function apiRequest<T>(
  path: `/${string}`,
  init: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    })
  } catch {
    return { ok: false, error: NETWORK_ERROR }
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
      issues: body?.issues,
    },
  }
}
