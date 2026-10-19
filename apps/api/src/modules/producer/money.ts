/**
 * Dinheiro do painel do produtor. O banco guarda `numeric(10,2)` em reais; as contas aqui são
 * feitas em CENTAVOS inteiros (nunca somar `float`) e só voltam a reais na borda da resposta.
 */

/** Converte reais (número ou texto `numeric` vindo do Postgres) em centavos inteiros. */
export function toCents(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const reais = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0
}

/** Centavos inteiros → reais (2 casas), o formato que as telas já esperam. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Valor digitado pelo usuário (reais) → centavos, ou `null` se não for um valor monetário válido
 * (NaN, infinito, mais de 2 casas decimais).
 */
export function parseReaisToCents(reais: number): number | null {
  if (!Number.isFinite(reais)) return null
  const cents = Math.round(reais * 100)
  return Math.abs(reais * 100 - cents) < 1e-6 ? cents : null
}
