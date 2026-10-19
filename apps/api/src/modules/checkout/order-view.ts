import type { OrderItemRow, OrderRow } from './order-fulfillment.js'
import { metadataOf } from './order-fulfillment.js'
import { OPEN_ORDER_STATUSES } from './order-transition.js'

/** Pedido como o DONO o enxerga (formato `snake_case` que as telas consomem). */
export type OrderView = {
  public_id: string
  status: string
  provider_status: string | null
  requested_payment_method: string | null
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  buyer_full_name: string
  buyer_email: string
  coupon_code: string | null
  /** Link de pagamento: só enquanto o pedido ainda espera pagamento. */
  checkout_url: string | null
  created_at: string
  paid_at: string | null
  finalized_at: string | null
  /** Só os marcadores que a tela de "finalizar conta" precisa (nunca o metadata inteiro). */
  metadata: {
    checkout_identity_mode: string | null
    account_created_after_payment: boolean
    account_password_defined_at: string | null
    pending_account: Record<string, never> | null
  }
  checkout_order_items: Array<{
    id: number
    course_id: number
    course_title: string
    listed_price: number
    final_price: number
  }>
}

/**
 * Lista fixa de campos: nada do gateway (id do pagamento, preferência), do usuário (`user_id`),
 * de telefone/CPF nem o `metadata` interno (rastreio de afiliado, comissões) sai daqui.
 */
/** `maria.silva@gmail.com` → `m***@g***.com` (a tela só precisa mostrar "para qual e-mail"). */
function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@')
  const [host = '', ...rest] = domain.split('.')
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***${rest.length > 0 ? `.${rest.join('.')}` : ''}`
}

export function toOrderView(
  order: OrderRow,
  items: OrderItemRow[],
  options: { maskBuyerEmail?: boolean } = {},
): OrderView {
  const metadata = metadataOf(order)
  const isOpen = (OPEN_ORDER_STATUSES as readonly string[]).includes(order.status)
  const pending = metadata.pending_account
  return {
    public_id: order.publicId,
    status: order.status,
    provider_status: order.providerStatus,
    requested_payment_method: order.requestedPaymentMethod,
    subtotal_amount: order.subtotalAmount,
    discount_amount: order.discountAmount,
    total_amount: order.totalAmount,
    buyer_full_name: order.buyerFullName,
    buyer_email: options.maskBuyerEmail ? maskEmail(order.buyerEmail) : order.buyerEmail,
    coupon_code: order.couponCode,
    checkout_url: isOpen ? order.checkoutUrl : null,
    created_at: order.createdAt.toISOString(),
    paid_at: order.paidAt?.toISOString() ?? null,
    finalized_at: order.finalizedAt?.toISOString() ?? null,
    metadata: {
      checkout_identity_mode:
        typeof metadata.checkout_identity_mode === 'string'
          ? metadata.checkout_identity_mode
          : null,
      account_created_after_payment: metadata.account_created_after_payment === true,
      account_password_defined_at:
        typeof metadata.account_password_defined_at === 'string'
          ? metadata.account_password_defined_at
          : null,
      pending_account: typeof pending === 'object' && pending !== null ? {} : null,
    },
    checkout_order_items: items.map((item) => ({
      id: item.id,
      course_id: item.courseId,
      course_title: item.courseTitle,
      listed_price: item.listedPrice,
      final_price: item.finalPrice,
    })),
  }
}
