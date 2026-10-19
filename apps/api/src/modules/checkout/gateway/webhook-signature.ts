import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Valida o `x-signature` das notificações do Mercado Pago (documentação "payment-notifications").
 *
 * Cabeçalho: `ts=<epoch>,v1=<hex>`. O valor assinado (manifest) é
 *   `id:<data.id da query, em minúsculas>;request-id:<x-request-id>;ts:<ts>;`
 * e o par que não veio na requisição sai do manifest. A conta é HMAC-SHA256 (hex) com a chave
 * secreta da aplicação.
 *
 * Não há janela de tempo de propósito: o Mercado Pago reenvia depois de 15 min, 6 h, 48 h e mais,
 * e uma janela curta rejeitaria reentregas legítimas. A defesa contra replay é outra: o pedido
 * nunca é alterado pelo corpo da notificação, só pelo pagamento reconsultado na API do gateway.
 */
export function verifyMercadoPagoSignature(input: {
  secret: string
  signatureHeader: string | undefined
  requestId: string | undefined
  dataId: string | undefined
}): boolean {
  if (!input.secret || !input.signatureHeader) return false

  const parts = new Map<string, string>()
  for (const part of input.signatureHeader.split(',')) {
    const [key, ...rest] = part.trim().split('=')
    if (key && rest.length > 0) parts.set(key, rest.join('='))
  }
  const ts = parts.get('ts')
  const v1 = parts.get('v1')
  if (!ts || !/^\d{1,16}$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false

  const manifest =
    (input.dataId ? `id:${input.dataId.toLowerCase()};` : '') +
    (input.requestId ? `request-id:${input.requestId};` : '') +
    `ts:${ts};`

  const expected = createHmac('sha256', input.secret).update(manifest).digest()
  const received = Buffer.from(v1, 'hex')
  // O tamanho é conferido ANTES: `timingSafeEqual` lança erro com tamanhos diferentes.
  return received.length === expected.length && timingSafeEqual(received, expected)
}
