/**
 * Link que pode ir num `href`/`src`: rota interna (`/algo`, nunca `//host` nem com contrabarra ou
 * espaço) ou URL http(s). Bloqueia `javascript:`, `data:`, `vbscript:` etc. O `z.url()` aceita
 * esses esquemas, e um link assim executaria script ao clicar.
 */
export function isSafeUrl(value: string): boolean {
  if (value.startsWith('/')) return !value.startsWith('//') && !/[\\\s]/.test(value)
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
