/**
 * Saldo do produtor, em CENTAVOS. Função pura: a mesma conta alimenta a tela de financeiro e a
 * validação do saque, para a tela nunca mostrar um saldo diferente do que o saque valida (saques
 * em andamento sempre são descontados).
 */
export type BalanceInputs = {
  /** Vendas concluídas e LIBERADAS (já passou o prazo de reembolso do aluno), valor líquido. */
  grossSalesCents: number
  /**
   * Vendas concluídas ainda dentro do prazo de reembolso (7 dias): contam como "a liberar". Assim o
   * produtor não saca um valor que o aluno ainda pode pedir de volta.
   */
  heldSalesCents: number
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
  const pending = Math.max(0, input.pendingSalesCents + input.heldSalesCents)
  return {
    available,
    pending,
    total: available + pending,
    lifetime: Math.max(0, input.grossSalesCents + input.heldSalesCents),
  }
}

/** Valor mínimo de saque (R$ 50,00), em centavos. */
export const MIN_WITHDRAWAL_CENTS = 5_000
