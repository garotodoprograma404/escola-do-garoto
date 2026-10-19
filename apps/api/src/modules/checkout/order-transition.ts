/** Estados do pedido (`checkout_orders.status`). */
export type OrderStatus =
  | 'pending'
  | 'in_process'
  | 'approved'
  | 'free_completed'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'failed'

/** Pedido que ainda espera pagamento. */
export const OPEN_ORDER_STATUSES = ['pending', 'in_process'] as const satisfies OrderStatus[]

/**
 * Pedidos que ainda SEGURAM a reserva do cupom. `failed` entra: o Mercado Pago deixa tentar outro
 * meio de pagamento no mesmo link depois de uma recusa, então o link ainda pode ser pago. A reserva só
 * volta quando o pedido é substituído ou expira, e nesses casos o link é encerrado no gateway.
 */
export const HOLDING_ORDER_STATUSES = [
  'pending',
  'in_process',
  'failed',
] as const satisfies OrderStatus[]

/** Pedido pago (aprovado pelo gateway ou grátis): o aluno tem acesso. */
const PAID_ORDER_STATUSES = ['approved', 'free_completed'] as const satisfies OrderStatus[]

export function isPaidStatus(status: string): boolean {
  return (PAID_ORDER_STATUSES as readonly string[]).includes(status)
}

/** O que o status de um pagamento do Mercado Pago significa para o nosso pedido. */
export type PaymentOutcome =
  'paid' | 'refunded' | 'failed' | 'cancelled' | 'in_process' | 'pending' | 'ignore'

/**
 * Tabela de status do Mercado Pago (documentação, "query-results"). Status desconhecido nunca
 * libera nada: a lista pode crescer, e "não sei" é tratado como "ignore".
 */
export function outcomeOfPaymentStatus(status: string): PaymentOutcome {
  switch (status) {
    case 'approved':
      return 'paid' // inclui status_detail `partially_refunded`: continua pago
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    case 'rejected':
      return 'failed'
    case 'cancelled':
      return 'cancelled'
    case 'pending':
      return 'pending'
    case 'in_process':
    case 'authorized':
    case 'in_mediation':
      return 'in_process'
    default:
      return 'ignore'
  }
}

/**
 * Novo status do pedido, ou `null` se não muda nada.
 *
 * `isOrdersPayment`: o pagamento é aquele que liquidou este pedido (mesmo id).
 *
 * - Pago libera de pendente, em análise, falho ou cancelado: quem pagou depois do prazo continua
 *   tendo pago (o valor é conferido antes, em `applyPayment`).
 * - Pedido estornado só volta a "aprovado" por um pagamento DIFERENTE do estornado (a pessoa pagou
 *   de novo); o mesmo pagamento reentregue/antigo não ressuscita o pedido.
 * - Estorno só derruba o pedido se for do pagamento que o liquidou: estorno de um pagamento
 *   duplicado não pode revogar o acesso de quem tem outro pagamento válido.
 * - Pedido já pago não volta para "pendente/falho" por evento atrasado.
 * - Pedido grátis (`free_completed`) nunca muda por evento de gateway.
 */
export function nextOrderStatus(
  current: OrderStatus,
  outcome: PaymentOutcome,
  isOrdersPayment: boolean,
): OrderStatus | null {
  const open = current === 'pending' || current === 'in_process'
  switch (outcome) {
    case 'paid':
      if (open || current === 'failed' || current === 'rejected' || current === 'cancelled') {
        return 'approved'
      }
      return current === 'refunded' && !isOrdersPayment ? 'approved' : null
    case 'refunded':
      return current === 'approved' && isOrdersPayment ? 'refunded' : null
    case 'failed':
      return open ? 'failed' : null
    case 'cancelled':
      return open ? 'cancelled' : null
    case 'in_process':
      return current === 'pending' ? 'in_process' : null
    case 'pending':
    case 'ignore':
      return null
  }
}
