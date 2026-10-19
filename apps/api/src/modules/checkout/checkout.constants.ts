/** Pedido pendente expira depois disso (o cupom reservado volta e o link de pagamento deixa de valer). */
export const ORDER_TTL_MS = 48 * 60 * 60 * 1000

/** No máximo isto de cursos por pedido. */
export const MAX_COURSES_PER_ORDER = 10

/** Limites por rota do checkout (janela de 1 minuto). */
const MINUTE = 60_000

/**
 * `default` = por IP (o servidor do Next, com a chave interna, fica de fora), `session` = por
 * pessoa logada (vale também para as chamadas do servidor do Next). O de sessão é o que limita
 * tentativa de cupom pela tela de checkout.
 */
export const CHECKOUT_RATE_LIMITS = {
  applyCoupon: { default: { limit: 30, ttl: MINUTE }, session: { limit: 20, ttl: MINUTE } },
  createOrder: { default: { limit: 10, ttl: MINUTE }, session: { limit: 8, ttl: MINUTE } },
  syncOrder: { default: { limit: 30, ttl: MINUTE }, session: { limit: 30, ttl: MINUTE } },
  finalizeAccount: { default: { limit: 5, ttl: MINUTE } },
} as const

/** Chaves de `platform_settings` com os métodos de pagamento. */
export const PAYMENT_SETTING_KEYS = {
  pixEnabled: 'payment_pix_enabled',
  creditCardEnabled: 'payment_credit_card_enabled',
  boletoEnabled: 'payment_boleto_enabled',
  maxInstallments: 'payment_max_installments',
  defaultInstallments: 'payment_default_installments',
} as const
