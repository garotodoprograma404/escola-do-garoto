import { z } from 'zod'
import { FINANCIAL_DATE_RANGES, FINANCIAL_TYPES } from './financials.service.js'

export const financialsQuerySchema = z.object({
  range: z.enum(FINANCIAL_DATE_RANGES).default('30d'),
  type: z.enum(FINANCIAL_TYPES).default('all'),
})
export type FinancialsQuery = z.infer<typeof financialsQuerySchema>

const text = (max: number) => z.string().trim().max(max).optional()

/**
 * Pedido de saque do produtor. O escopo da conta
 * NÃO vem do cliente: esta rota é só do produtor.
 */
export const withdrawalRequestSchema = z
  .object({
    amount: z
      .number({ error: 'Informe o valor do saque' })
      .min(50, 'Valor mínimo de saque é R$ 50,00')
      .max(1_000_000, 'Valor máximo por saque é R$ 1.000.000,00'),
    method: z.enum(['pix', 'bank_transfer'], { error: 'Escolha o método de saque' }),
    pix_key: text(140),
    bank_code: text(20),
    bank_agency: text(20),
    bank_account: text(30),
    account_type: z.enum(['checking', 'savings']).optional(),
  })
  .superRefine((data, ctx) => {
    const require = (field: keyof typeof data, message: string) => {
      if (!data[field]) ctx.addIssue({ code: 'custom', path: [field], message })
    }
    if (data.method === 'pix') {
      require('pix_key', 'Chave PIX é obrigatória para saque via PIX')
    } else {
      require('bank_code', 'Banco é obrigatório para transferência bancária')
      require('bank_agency', 'Agência é obrigatória para transferência bancária')
      require('bank_account', 'Conta é obrigatória para transferência bancária')
      require('account_type', 'Tipo de conta é obrigatório para transferência bancária')
    }
  })
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>
