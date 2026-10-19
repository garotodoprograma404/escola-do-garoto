import { apiServer } from '@/lib/server-api'

export interface CouponCartItemInput {
  courseId: number
  /** Só exibição: a API recalcula o preço a partir do banco e ignora este valor. */
  price: number
  couponsEnabled?: boolean
}

export interface CouponCalculationResult {
  success: boolean
  message: string
  couponCode?: string
  discount: number
  subtotal: number
  eligibleSubtotal: number
  finalTotal: number
  eligibleCourseIds: number[]
}

interface ApplyCouponResponse {
  success: boolean
  message: string
  discount: number
  subtotal: number
  final_total: number
  eligible_course_ids: number[]
}

function failure(message: string): CouponCalculationResult {
  return {
    success: false,
    message,
    discount: 0,
    subtotal: 0,
    eligibleSubtotal: 0,
    finalTotal: 0,
    eligibleCourseIds: [],
  }
}

/**
 * "Aplicar cupom" do carrinho. Chamador fino da API: ela confere o cupom (validade, limite, uso por
 * pessoa, cursos, mínimo, teto) e calcula o desconto sobre o preço do BANCO. O que o navegador
 * mandou de preço não conta. Nada é reservado aqui: o cupom só é reservado ao criar o pedido.
 *
 * Exige login: assim ninguém testa códigos sem limite nem descobre se um cupom existe, está
 * vencido ou esgotado.
 */
export async function calculateCouponForCart(
  code: string,
  cartItems: CouponCartItemInput[],
): Promise<CouponCalculationResult> {
  const normalizedCode = code.trim().toUpperCase()
  if (normalizedCode.length === 0) return failure('Digite um código de cupom')

  const courseIds = [
    ...new Set(
      cartItems
        .map((item) => item.courseId)
        .filter((courseId) => Number.isInteger(courseId) && courseId > 0),
    ),
  ]
  if (courseIds.length === 0) return failure('Carrinho vazio')

  const result = await apiServer<ApplyCouponResponse>('/checkout/coupons/apply', {
    method: 'POST',
    body: { code: normalizedCode, courseIds },
  })

  if (!result.ok) {
    if (result.error.statusCode === 401) {
      return failure('Faça login ou crie sua conta para aplicar um cupom.')
    }
    if (result.error.statusCode === 429) {
      return failure('Muitas tentativas. Aguarde um instante e tente de novo.')
    }
    return failure(result.error.statusCode === 400 ? 'Cupom inválido' : result.error.message)
  }

  const data = result.data
  if (!data.success) return failure(data.message)

  return {
    success: true,
    message: data.message,
    couponCode: normalizedCode,
    discount: data.discount,
    subtotal: data.subtotal,
    eligibleSubtotal: data.subtotal,
    finalTotal: data.final_total,
    eligibleCourseIds: data.eligible_course_ids,
  }
}
