/**
 * Saldo do produtor, em CENTAVOS. Função pura: a mesma conta alimenta a tela de financeiro e a
 * validação do saque, para a tela nunca mostrar um saldo diferente do que o saque valida (saques
 * em andamento sempre são descontados).
 */
export type BalanceInputs = {
  /** Vendas concluídas (`sale` + `completed`), valor líquido do produtor. */
  grossSalesCents: number
  /** Vendas ainda não compensadas (`sale` + `pending`). */
  pendingSalesCents: number
  /** Reembolsos (`refund` concluídos ou marcados como reembolsados). */
  refundsCents: number
  /** Saques que já "gastaram" o saldo: pendente, aprovado, em processamento e pago. */
  reservedWithdrawalsCents: number
}

export type ProducerBalanceCents = {
  available: number
  pending: number
  total: number
  lifetime: number
}

export function computeProducerBalance(input: BalanceInputs): ProducerBalanceCents {
  const available = Math.max(
    0,
    input.grossSalesCents - input.refundsCents - input.reservedWithdrawalsCents,
  )
  const pending = Math.max(0, input.pendingSalesCents)
  return {
    available,
    pending,
    total: available + pending,
    lifetime: Math.max(0, input.grossSalesCents),
  }
}

/** Valor mínimo de saque (R$ 50,00), em centavos. */
export const MIN_WITHDRAWAL_CENTS = 5_000
