// =====================================================
// APPLY COUPON - SERVER ACTION
// =====================================================

'use server'

import type { ApplyCouponResult } from '../types'
import { calculateCouponForCart } from '../services/coupon-calculator'
import { getCartCourseSnapshots } from '../services/cartService'

interface CouponCartItemPayload {
  id: string
  /** Ignorado: o preço vem sempre do banco (cliente nunca manda preço). */
  price?: number
  couponsEnabled?: boolean
}

export async function applyCouponAction(
  code: string,
  cartItems: CouponCartItemPayload[],
): Promise<ApplyCouponResult> {
  try {
    const requestedIds = cartItems
      .map((item) => Number.parseInt(item.id, 10))
      .filter((id) => Number.isFinite(id) && id > 0)

    // Só os ids do carrinho valem. Preço e "aceita cupom" são os ATUAIS do banco; um cookie ou
    // um corpo de requisição adulterado não consegue baixar o preço para o cupom render mais.
    const snapshots = await getCartCourseSnapshots(requestedIds)
    if (!snapshots) {
      return {
        success: false,
        message: 'Não foi possível validar o carrinho agora. Tente novamente.',
      }
    }

    const normalizedCart = snapshots.map((snapshot) => ({
      courseId: Number.parseInt(snapshot.id, 10),
      price: snapshot.price,
      couponsEnabled: snapshot.coupons_enabled,
    }))

    const result = await calculateCouponForCart(code, normalizedCart)

    return {
      success: result.success,
      message: result.message,
      discount: result.discount,
      finalTotal: result.finalTotal,
    }
  } catch (error) {
    console.error('Error applying coupon:', error)
    return {
      success: false,
      message: 'Erro ao aplicar cupom',
    }
  }
}
