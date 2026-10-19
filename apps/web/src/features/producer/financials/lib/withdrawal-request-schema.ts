import { z } from 'zod'

const withdrawalRequestSchemaBase = z.object({
  amount: z.number().min(50, 'Valor mínimo de saque é R$ 50,00'),
  method: z.enum(['pix', 'bank_transfer']),
  account_scope: z.enum(['producer', 'affiliate']).default('producer'),
  revalidate_path: z.string().optional(),
  pix_key: z.string().trim().optional(),
  bank_code: z.string().trim().optional(),
  bank_agency: z.string().trim().optional(),
  bank_account: z.string().trim().optional(),
  account_type: z.enum(['checking', 'savings']).optional(),
})

function attachWithdrawalMethodValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    if (data.method === 'pix' && !data.pix_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pix_key'],
        message: 'Chave PIX é obrigatória para saque via PIX',
      })
    }

    if (data.method === 'bank_transfer') {
      if (!data.bank_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bank_code'],
          message: 'Banco é obrigatório para transferência bancária',
        })
      }

      if (!data.bank_agency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bank_agency'],
          message: 'Agência é obrigatória para transferência bancária',
        })
      }

      if (!data.bank_account) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bank_account'],
          message: 'Conta é obrigatória para transferência bancária',
        })
      }

      if (!data.account_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['account_type'],
          message: 'Tipo de conta é obrigatório para transferência bancária',
        })
      }
    }
  })
}

export const withdrawalRequestSchema = attachWithdrawalMethodValidation(withdrawalRequestSchemaBase)

export const withdrawalRequestClientSchema = attachWithdrawalMethodValidation(
  withdrawalRequestSchemaBase.omit({ account_scope: true, revalidate_path: true }),
)

export type WithdrawalRequestClientInput = z.infer<typeof withdrawalRequestClientSchema>
