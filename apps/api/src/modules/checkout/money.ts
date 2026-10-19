/**
 * Dinheiro sempre em CENTAVOS INTEIROS dentro do sistema. Ponto flutuante só existe na fronteira
 * com o Mercado Pago (que fala em reais decimais), e é convertido aqui, num lugar só.
 */

/** Centavos → reais decimais para o Mercado Pago (`19990` → `199.9`). */
export function centsToReais(cents: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0)
    throw new RangeError(`Centavos inválidos: ${cents}`)
  return Number((cents / 100).toFixed(2))
}

/**
 * Reais decimais do Mercado Pago → centavos. Aceita número ou texto ("24.50"); recusa o que não é
 * dinheiro de verdade (negativo, NaN, mais de 2 casas) em vez de arredondar e seguir em frente:
 * valor estranho num pagamento é motivo para NÃO liberar o curso.
 */
export function reaisToCents(value: number | string): number | null {
  // Texto só vale no formato "123" ou "123.45": vazio, espaços ou "1e3" NÃO podem virar zero/valor.
  if (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value)) return null
  const number = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(number) || number < 0) return null
  const cents = Math.round(number * 100)
  // 0.1 + 0.2 e afins: tolera erro de ponto flutuante, mas não centésimos de centavo reais.
  if (Math.abs(number * 100 - cents) > 1e-6) return null
  return cents
}

/**
 * Divide `total` centavos entre os pesos, proporcionalmente, com a soma EXATA (método do maior
 * resto). Nenhum centavo se perde nem sobra: `sum(resultado) === total`.
 */
export function allocateProportionally(total: number, weights: readonly number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError(`Total inválido: ${total}`)
  if (weights.length === 0) return []

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) return weights.map(() => 0)

  const shares = weights.map((weight, index) => {
    const exact = (total * weight) / weightSum
    return { index, floor: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let leftover = total - shares.reduce((sum, share) => sum + share.floor, 0)

  // Quem tem o maior resto ganha o centavo que sobrou (desempate: o primeiro da lista).
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const share of byRemainder) {
    if (leftover <= 0) break
    share.floor += 1
    leftover -= 1
  }
  return shares.map((share) => share.floor)
}

/**
 * Valor que vem do NOSSO banco (`numeric(10,2)`, em reais) → centavos. O banco só guarda duas
 * casas, então o arredondamento aqui só desfaz o erro de ponto flutuante (`19.9 * 100`).
 * Nulo ou inválido vira 0: nunca `NaN` num cálculo de dinheiro.
 */
export function dbToCents(value: number | string | null | undefined): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0
}
