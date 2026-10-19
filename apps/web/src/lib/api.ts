import 'server-only'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3333'

/**
 * Cabeçalho que identifica o servidor do Next perante a API (segredo compartilhado, nunca vai ao
 * navegador). Sem ele, as páginas renderizadas chegariam todas do mesmo IP e um único visitante
 * esgotaria o limite de requisições do site inteiro.
 */
function internalHeaders(): Record<string, string> {
  const key = process.env.INTERNAL_API_KEY
  return key ? { 'x-internal-key': key } : {}
}

/**
 * Leitura de dado PÚBLICO da API (sem cookie). `null` quando não existe (404).
 * Não define cache próprio: quem decide por quanto tempo guardar é a função que chama,
 * com `'use cache'` + `cacheLife`.
 */
export async function apiGetPublic<T>(path: `/${string}`): Promise<T | null> {
  const res = await fetch(`${API_URL}/api${path}`, { headers: internalHeaders() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API ${path} respondeu ${res.status}`)
  return (await res.json()) as T
}
