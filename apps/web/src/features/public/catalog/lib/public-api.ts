import 'server-only'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3333'

type Query = Record<string, string | number | boolean | null | undefined>

function buildQuery(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/**
 * GET em rota PÚBLICA da API, sem cookie de sessão: serve para dados que podem ficar no cache do
 * Next (`unstable_cache`), que não pode ler `cookies()`. Lança erro se a API falhar, para o cache
 * nunca guardar um resultado de falha. Nunca use para dado de pessoa logada.
 */
export async function publicApiGet<T>(path: `/${string}`, query?: Query): Promise<T> {
  const headers: Record<string, string> = {}
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey) headers['x-internal-key'] = internalKey

  const response = await fetch(`${API_URL}/api${path}${buildQuery(query)}`, {
    headers,
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Falha ao consultar a API pública (${response.status}) em ${path}`)
  }
  return (await response.json()) as T
}
