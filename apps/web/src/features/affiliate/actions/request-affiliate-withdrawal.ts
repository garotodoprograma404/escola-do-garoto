'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { withdrawalRequestSchema } from '@/features/producer/financials/lib/withdrawal-request-schema'
import { getApiErrorMessage } from '../lib/api-error'

const REVALIDATE_ALLOWED = new Set(['/affiliate', '/producer/financials'])

/**
 * Saque do afiliado (`account_scope = 'affiliate'`). Mesmo formulário e mesmo retorno de
 * `requestWithdrawalAction` (producer/financials): aquela action deve delegar para esta quando o
 * escopo for `affiliate`. O saldo é conferido NA API, dentro de uma transação com trava, então
 * pedidos simultâneos não passam do saldo.
 */
export async function requestAffiliateWithdrawalAction(formData: FormData) {
  try {
    const rawData = {
      amount: Number(formData.get('amount')),
      method: formData.get('method') as string,
      account_scope: 'affiliate',
      revalidate_path: (formData.get('revalidate_path') as string) || undefined,
      pix_key: (formData.get('pix_key') as string) || undefined,
      bank_code: (formData.get('bank_code') as string) || undefined,
      bank_agency: (formData.get('bank_agency') as string) || undefined,
      bank_account: (formData.get('bank_account') as string) || undefined,
      account_type: (formData.get('account_type') as string) || undefined,
    }

    const validated = withdrawalRequestSchema.parse(rawData)

    const result = await apiServer('/affiliate/withdrawals', {
      method: 'POST',
      body: {
        amount: validated.amount,
        method: validated.method,
        pix_key: validated.pix_key,
        bank_code: validated.bank_code,
        bank_agency: validated.bank_agency,
        bank_account: validated.bank_account,
        account_type: validated.account_type,
      },
    })

    if (!result.ok) {
      if (result.error.statusCode === 403) {
        return { success: false, error: 'Perfil sem permissão para este tipo de saque' }
      }
      return {
        success: false,
        error: getApiErrorMessage(result.error, 'Erro ao processar solicitação'),
      }
    }

    // Só caminhos conhecidos: o valor vem do formulário (cliente).
    revalidatePath(
      validated.revalidate_path && REVALIDATE_ALLOWED.has(validated.revalidate_path)
        ? validated.revalidate_path
        : '/affiliate',
    )

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }

    return { success: false, error: 'Erro ao processar solicitação' }
  }
}
