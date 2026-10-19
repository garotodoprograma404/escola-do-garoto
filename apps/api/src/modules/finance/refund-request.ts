import type { transactions } from '../../database/schema/index.js'

/**
 * Pedido de reembolso do aluno: uma linha `refund` em `transactions` que aponta para a compra
 * (`metadata.original_transaction_id`). O andamento mora no `status` + `metadata`:
 *
 *   pending ──admin aprova──▶ pending + approved_at ──estorno confirmado──▶ completed
 *      └──admin recusa──▶ failed (closed_reason: rejected)
 *
 * O estorno feito direto no Mercado Pago também conclui o pedido (ver `revokeOrderAccess`).
 */

/** Prazo do direito de arrependimento (CDC, art. 49): o mesmo da política de reembolso. */
export const REFUND_WINDOW_DAYS = 7

export type RefundStage = 'requested' | 'approved' | 'completed' | 'rejected'

type RefundRow = Pick<typeof transactions.$inferSelect, 'status' | 'metadata'>

export function refundMetadataOf(row: Pick<RefundRow, 'metadata'>): Record<string, unknown> {
  const metadata = row.metadata
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {}
}

export function refundStageOf(row: RefundRow): RefundStage {
  const metadata = refundMetadataOf(row)
  if (row.status === 'completed' || row.status === 'refunded') return 'completed'
  if (row.status === 'failed')
    return metadata.closed_reason === 'rejected' ? 'rejected' : 'completed'
  return typeof metadata.approved_at === 'string' ? 'approved' : 'requested'
}

/** Até quando a compra pode ter reembolso pedido. */
export function refundDeadlineOf(purchasedAt: Date): Date {
  return new Date(purchasedAt.getTime() + REFUND_WINDOW_DAYS * 86_400_000)
}
