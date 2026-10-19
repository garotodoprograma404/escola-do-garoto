// =====================================================
// PROCESS CHECKOUT - SERVER ACTION (MERCADO PAGO)
// =====================================================
//
// Chamador fino da API. Todo o cálculo (preço, promoção, cupom, comissão, rateio, total) e a
// criação do pedido acontecem no servidor da API a partir do que está no banco: o navegador só
// diz QUAIS cursos, o cupom e o método preferido. Preço enviado pelo carrinho (cookie) é só
// exibição e nem sai daqui.

'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import {
  AFFILIATE_SESSION_COOKIE_NAME,
  AFFILIATE_VISITOR_COOKIE_NAME,
} from '@/features/affiliate/lib/attribution'
import type { CheckoutFormData, CheckoutResult } from '../types'

interface CreatedOrderResponse {
  order_id: string
  status: string
  redirect_url: string | null
  should_clear_cart: boolean
  message: string
}

async function readAffiliateTracking() {
  const cookieStore = await cookies()
  const sessionKey = cookieStore.get(AFFILIATE_SESSION_COOKIE_NAME)?.value?.trim() || null
  const visitorKey = cookieStore.get(AFFILIATE_VISITOR_COOKIE_NAME)?.value?.trim() || null
  return sessionKey || visitorKey ? { sessionKey, visitorKey } : undefined
}

export async function processCheckoutAction(
  formData: CheckoutFormData,
  cartItems: Array<{ id: string; price: number }>,
): Promise<CheckoutResult> {
  try {
    if (cartItems.length === 0) {
      return { success: false, message: 'Carrinho vazio' }
    }

    const courseIds = [
      ...new Set(
        cartItems
          .map((item) => Number.parseInt(item.id, 10))
          .filter((courseId) => Number.isFinite(courseId) && courseId > 0),
      ),
    ]

    if (courseIds.length === 0) {
      return { success: false, message: 'Itens inválidos no carrinho' }
    }

    const couponCode = formData.coupon_code?.trim()

    const result = await apiServer<CreatedOrderResponse>('/checkout/orders', {
      method: 'POST',
      body: {
        courseIds,
        paymentMethod: formData.payment_method,
        ...(couponCode ? { couponCode } : {}),
        affiliate: await readAffiliateTracking(),
      },
    })

    if (!result.ok) {
      return {
        success: false,
        message:
          result.error.statusCode === 401
            ? 'Faça login ou crie sua conta antes de finalizar a compra.'
            : result.error.message,
      }
    }

    const order = result.data

    if (order.should_clear_cart) {
      revalidatePath('/cart')
      revalidatePath('/student')
      revalidatePath('/student/courses')
      revalidatePath('/producer')
      revalidatePath('/producer/financials')
      revalidatePath('/admin/finance')
    }

    return {
      success: true,
      message: order.message,
      order_id: order.order_id,
      redirect_url: order.redirect_url ?? undefined,
      should_clear_cart: order.should_clear_cart,
    }
  } catch (error) {
    console.error('checkout error:', error)
    return { success: false, message: 'Erro ao processar pagamento' }
  }
}
