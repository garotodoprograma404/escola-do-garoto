const INTERNAL_BASE = 'http://interno'
// Caracteres de controle (inclui tab/quebra de linha, que o navegador remove ao interpretar a URL).
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/

/**
 * Aceita só caminhos internos (`/cursos/x?y=1`) e devolve `fallback` para todo o resto.
 * Usado no front (`?redirect=`) e na API (link de e-mail): os dois precisam da MESMA regra.
 *
 * Atenção: `new URL('/.//evil.com')` normaliza o caminho para `//evil.com`, que o navegador
 * entende como OUTRO SITE. Por isso o resultado normalizado também é conferido.
 */
export function safeInternalPath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return fallback
  if (CONTROL_CHARS.test(value)) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback

  let url: URL
  try {
    url = new URL(value, INTERNAL_BASE)
  } catch {
    return fallback
  }
  if (url.origin !== INTERNAL_BASE) return fallback

  const normalized = `${url.pathname}${url.search}${url.hash}`
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return fallback
  return normalized
}
