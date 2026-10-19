/**
 * Dinheiro do programa de afiliados: sempre em CENTAVOS inteiros dentro do service.
 * Reais decimais (o `numeric(10,2)` do banco) só existem na fronteira: ao ler/gravar e na resposta.
 */

/** Reais (como o banco devolve) → centavos inteiros. Valor inválido vira 0. */
export function reaisToCents(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100)
}

/** Centavos inteiros → reais com 2 casas, para a resposta JSON. */
export function centsToReais(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Comissão do afiliado = percentual da fatia do PRODUTOR, em centavos.
 * `ratePercent` tem até 2 casas (ex.: 12.5): converte para pontos-base inteiros antes de multiplicar.
 * Arredonda meio-centavo para cima.
 */
export function computeAffiliateCommissionCents(
  producerGrossCents: number,
  ratePercent: number,
): { affiliateCents: number; producerNetCents: number } {
  const gross = Number.isFinite(producerGrossCents)
    ? Math.max(0, Math.round(producerGrossCents))
    : 0
  const rate = Number.isFinite(ratePercent) ? Math.min(100, Math.max(0, ratePercent)) : 0
  const basisPoints = Math.round(rate * 100)
  const affiliateCents = Math.round((gross * basisPoints) / 10_000)
  return { affiliateCents, producerNetCents: Math.max(0, gross - affiliateCents) }
}
