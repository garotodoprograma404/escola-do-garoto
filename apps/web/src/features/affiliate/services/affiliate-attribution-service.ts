import 'server-only'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3333'
/** O clique não pode segurar a navegação: se a API demorar, desistimos. */
const CLICK_TIMEOUT_MS = 2000

/**
 * Avisa a API que alguém chegou por um link de afiliado (`?aff=codigo`). Chamada pelo proxy.
 *
 * - Não usa `apiServer`: no proxy não existe `cookies()` do Next, e esta rota da API é pública.
 * - NÃO manda a chave interna (`x-internal-key`): sem ela a API aplica o limite de tentativas por
 *   IP; repassamos o IP do visitante em `x-forwarded-for` para o limite ser por pessoa.
 * - A API responde igual para código que existe e que não existe, então não há retorno útil.
 *   Lança erro se a API falhar; o proxy captura e segue a navegação.
 */
export async function registerAffiliateClickAttribution(input: {
  code: string
  sessionKey: string
  visitorKey: string | null
  path: string
  search: string
  referrer?: string | null
  userAgent?: string | null
  forwardedFor?: string | null
}): Promise<void> {
  const response = await fetch(`${API_URL}/api/affiliate/clicks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(input.forwardedFor ? { 'x-forwarded-for': input.forwardedFor } : {}),
    },
    body: JSON.stringify({
      code: input.code,
      sessionKey: input.sessionKey,
      visitorKey: input.visitorKey,
      path: input.path,
      search: input.search,
      referrer: input.referrer ?? null,
      userAgent: input.userAgent ?? null,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(CLICK_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Erro ao registrar clique de afiliado (API respondeu ${response.status})`)
  }
}
