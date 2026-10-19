// =====================================================
// CHECKOUT ORDER SERVICE (chamador fino da API)
// =====================================================
//
// Toda a regra mora na API NestJS (`apps/api/src/modules/checkout`): aqui só se pergunta o
// estado do pedido. O pedido só é visível ao DONO (sessão), e a consulta ao Mercado
// Pago ("reconciliação") é a API que faz, conferindo valor e referência.

import { apiServer } from '@/lib/server-api'

export type CheckoutOrderStatus =
  | 'pending'
  | 'approved'
  | 'in_process'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'free_completed'
  | 'failed'

interface CheckoutOrderItemView {
  id: number
  course_id: number
  course_title: string
  listed_price: number
  final_price: number
}

/** Pedido como a API o devolve ao dono. */
export interface CheckoutOrderView {
  public_id: string
  status: CheckoutOrderStatus
  provider_status: string | null
  requested_payment_method: string | null
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  buyer_full_name: string
  buyer_email: string
  coupon_code: string | null
  checkout_url: string | null
  created_at: string
  paid_at: string | null
  finalized_at: string | null
  metadata: {
    checkout_identity_mode: string | null
    account_created_after_payment: boolean
    account_password_defined_at: string | null
    pending_account: Record<string, never> | null
  }
  checkout_order_items: CheckoutOrderItemView[]
}

export type CheckoutOrderLookup =
  { order: CheckoutOrderView; unauthenticated: false } | { order: null; unauthenticated: boolean }

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Pedido do usuário logado. `unauthenticated: true` quando não há sessão (a tela manda para o
 * login); `order: null` com `unauthenticated: false` quando o pedido não existe ou não é dele
 * (a API responde igual nos dois casos, de propósito).
 */
export async function lookupCheckoutOrder(publicId: string): Promise<CheckoutOrderLookup> {
  const normalized = String(publicId || '').trim()
  if (!normalized || !isValidUuid(normalized)) return { order: null, unauthenticated: false }

  const result = await apiServer<CheckoutOrderView>(`/checkout/orders/${normalized}`)
  if (result.ok) return { order: result.data, unauthenticated: false }
  return { order: null, unauthenticated: result.error.statusCode === 401 }
}

/**
 * Pedido SEM conta de aluno (compra feita sem cadastro), para a tela de finalizar conta. A API só
 * responde por pedido sem dono; o id do pedido (impossível de adivinhar) é a credencial.
 */
export async function lookupGuestCheckoutOrder(
  publicId: string,
): Promise<CheckoutOrderView | null> {
  const normalized = String(publicId || '').trim()
  if (!normalized || !isValidUuid(normalized)) return null

  const result = await apiServer<CheckoutOrderView>(`/checkout/orders/${normalized}/guest`)
  return result.ok ? result.data : null
}

/**
 * Pede à API que confira no Mercado Pago os pagamentos do pedido e atualize o estado (cobre o
 * intervalo entre pagar e a notificação do webhook chegar). Devolve o pedido já atualizado.
 */
export async function reconcileCheckoutOrderPaymentByPublicId(
  publicId: string,
): Promise<{ success: boolean; status?: CheckoutOrderStatus; message?: string }> {
  const normalized = String(publicId || '').trim()
  if (!normalized || !isValidUuid(normalized)) {
    return { success: false, message: 'Pedido inválido para reconciliação' }
  }

  const result = await apiServer<CheckoutOrderView>(`/checkout/orders/${normalized}/sync`, {
    method: 'POST',
  })
  if (!result.ok) return { success: false, message: result.error.message }
  return { success: true, status: result.data.status }
}
