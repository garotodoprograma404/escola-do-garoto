import { z } from 'zod'

export const idParamSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** Filtros do histórico de compras do aluno (a tela filtra no navegador, mas a API também aceita). */
export const studentTransactionsQuerySchema = z.object({
  searchTerm: z.string().trim().max(100).optional(),
  year: z
    .string()
    .regex(/^(all|\d{4})$/)
    .optional(),
  status: z.enum(['all', 'completed', 'pending', 'failed', 'refunded']).optional(),
})
export type StudentTransactionsQuery = z.infer<typeof studentTransactionsQuerySchema>

export const refundRequestSchema = z.object({
  transactionId: idParamSchema,
  reason: z.string().trim().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(1000),
})
export type RefundRequestInput = z.infer<typeof refundRequestSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')

export const withdrawalFiltersSchema = z.object({
  searchTerm: z.string().trim().max(100).optional(),
  status: z
    .enum(['ALL', 'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'])
    .default('ALL'),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  producerId: z.union([z.literal('ALL'), z.uuid()]).default('ALL'),
})
export type WithdrawalFilters = z.infer<typeof withdrawalFiltersSchema>

export const rejectWithdrawalSchema = z.object({
  reason: z.string().trim().min(10, 'O motivo deve ter pelo menos 10 caracteres').max(500),
})
export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>

export const payWithdrawalSchema = z.object({
  /** Comprovante/identificador do pagamento feito fora do sistema (ex.: id do Pix). */
  transactionId: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
})
export type PayWithdrawalInput = z.infer<typeof payWithdrawalSchema>

export const reportQuerySchema = z
  .object({
    format: z.enum(['pdf', 'excel', 'csv']).default('csv'),
    dateFrom: isoDate,
    dateTo: isoDate,
  })
  .refine((query) => query.dateFrom <= query.dateTo, {
    message: 'A data inicial não pode ser depois da final',
    path: ['dateTo'],
  })
export type ReportQuery = z.infer<typeof reportQuerySchema>
