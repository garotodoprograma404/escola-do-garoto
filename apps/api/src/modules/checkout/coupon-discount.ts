import { allocateProportionally } from './money.js'

export type CouponRule = {
  type: 'percentage' | 'fixed'
  /** `percentage`: pontos-base (1000 = 10%). `fixed`: centavos. */
  value: number
  minSubtotalCents: number | null
  maxDiscountCents: number | null
  /** `null` ou vazio = vale para qualquer curso. */
  applicableCourseIds: readonly number[] | null
  /** `null` ou vazio = vale para qualquer categoria. */
  applicableCategoryIds: readonly number[] | null
}

export type CartLine = {
  courseId: number
  categoryId: number
  /** Preço que vale hoje (já com a promoção do curso), em centavos. */
  priceCents: number
  /** `courses.coupons_enabled`: o produtor/admin pode barrar cupom em um curso. */
  couponsEnabled: boolean
}

export type CouponRejectionCode = 'not_applicable' | 'below_minimum' | 'no_discount'

/** Cupom que não pode ser usado neste carrinho. A mensagem é segura para mostrar ao usuário. */
export class CouponRejectedError extends Error {
  constructor(
    readonly code: CouponRejectionCode,
    message: string,
  ) {
    super(message)
  }
}

export type CouponDiscount = {
  totalDiscountCents: number
  /** Desconto de cada linha, na mesma ordem de `lines`. A soma é exatamente `totalDiscountCents`. */
  perLineCents: number[]
  /** Cursos que entraram na conta (ordem do carrinho). */
  eligibleCourseIds: number[]
  eligibleSubtotalCents: number
}

const formatReais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/**
 * Calcula o desconto do cupom sobre o preço JÁ promocional de cada curso (promoção do curso e
 * cupom empilham, nessa ordem). Regras:
 *
 * - só as linhas elegíveis entram na conta (curso com cupom desligado e cursos fora da lista do
 *   cupom ficam de fora);
 * - o mínimo de compra é conferido sobre o subtotal ELEGÍVEL;
 * - o teto de desconto e o próprio subtotal elegível limitam o resultado;
 * - o desconto é rateado por centavos (maior resto): a soma das linhas bate exatamente.
 *
 * O percentual arredonda para BAIXO: arredondar ao mais próximo podia dar meio centavo a mais que o
 * prometido.
 */
export function computeCouponDiscount(
  rule: CouponRule,
  lines: readonly CartLine[],
): CouponDiscount {
  const courseScope = rule.applicableCourseIds ?? []
  const categoryScope = rule.applicableCategoryIds ?? []
  const eligible = lines.map(
    (line) =>
      line.couponsEnabled &&
      (courseScope.length === 0 || courseScope.includes(line.courseId)) &&
      (categoryScope.length === 0 || categoryScope.includes(line.categoryId)),
  )

  if (!eligible.some(Boolean)) {
    throw new CouponRejectedError('not_applicable', 'Cupom não aplicável aos cursos do carrinho')
  }

  const eligibleSubtotal = lines.reduce(
    (sum, line, index) => (eligible[index] ? sum + line.priceCents : sum),
    0,
  )

  if (rule.minSubtotalCents !== null && eligibleSubtotal < rule.minSubtotalCents) {
    throw new CouponRejectedError(
      'below_minimum',
      `Valor mínimo para este cupom: R$ ${formatReais(rule.minSubtotalCents)}`,
    )
  }

  let discount =
    rule.type === 'percentage'
      ? Math.floor((eligibleSubtotal * rule.value) / 10_000)
      : Math.max(0, rule.value)
  if (rule.maxDiscountCents !== null) discount = Math.min(discount, rule.maxDiscountCents)
  discount = Math.min(discount, eligibleSubtotal)

  if (discount <= 0) {
    throw new CouponRejectedError(
      'no_discount',
      'Este cupom não gera desconto para o carrinho atual',
    )
  }

  // Rateia só entre as elegíveis; as outras ficam com zero.
  const eligibleIndexes = lines.flatMap((_, index) => (eligible[index] ? [index] : []))
  const shares = allocateProportionally(
    discount,
    eligibleIndexes.map((index) => lines[index]!.priceCents),
  )
  const perLineCents = lines.map(() => 0)
  eligibleIndexes.forEach((lineIndex, shareIndex) => {
    perLineCents[lineIndex] = shares[shareIndex]!
  })

  return {
    totalDiscountCents: discount,
    perLineCents,
    eligibleCourseIds: eligibleIndexes.map((index) => lines[index]!.courseId),
    eligibleSubtotalCents: eligibleSubtotal,
  }
}
