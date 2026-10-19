// =====================================================
// PRODUCER FINANCIALS - REQUEST WITHDRAWAL ACTION
// =====================================================

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requestAffiliateWithdrawalAction } from '@/features/affiliate/actions/request-affiliate-withdrawal'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '@/features/producer/services/api-errors'
import { withdrawalRequestSchema } from '../lib/withdrawal-request-schema'

/** Só revalida telas de saque (o caminho vem do formulário, então não é confiável). */
function resolveRevalidatePath(requested: string | undefined): string {
  if (requested && /^\/(producer|affiliate)(\/[a-z0-9-]*)*$/.test(requested)) return requested
  return '/producer/financials'
}

/**
 * Pede um saque. A API calcula o saldo e grava o pedido numa transação com trava (o saldo nunca é
 * calculado aqui), confere o papel e usa sempre o usuário da sessão.
 * Conta de produtor: `POST /producer/withdrawals`. Conta de afiliado: `POST /affiliate/withdrawals`.
 */
export async function requestWithdrawalAction(formData: FormData) {
  // Saque de afiliado: a API do programa de afiliados confere o saldo (com trava contra saque duplo).
  if (formData.get('account_scope') === 'affiliate') {
    return requestAffiliateWithdrawalAction(formData)
  }

  try {
    const rawData = {
      amount: parseFloat(formData.get('amount') as string),
      method: formData.get('method') as string,
      account_scope: (formData.get('account_scope') as string) || 'producer',
      revalidate_path: (formData.get('revalidate_path') as string) || undefined,
      pix_key: (formData.get('pix_key') as string) || undefined,
      bank_code: (formData.get('bank_code') as string) || undefined,
      bank_agency: (formData.get('bank_agency') as string) || undefined,
      bank_account: (formData.get('bank_account') as string) || undefined,
      account_type: (formData.get('account_type') as string) || undefined,
    }

    const validatedData = withdrawalRequestSchema.parse(rawData)

    const result = await apiServer(
      validatedData.account_scope === 'affiliate'
        ? '/affiliate/withdrawals'
        : '/producer/withdrawals',
      {
        method: 'POST',
        body: {
          amount: validatedData.amount,
          method: validatedData.method,
          pix_key: validatedData.pix_key,
          bank_code: validatedData.bank_code,
          bank_agency: validatedData.bank_agency,
          bank_account: validatedData.bank_account,
          account_type: validatedData.account_type,
        },
      },
    )

    if (!result.ok) {
      if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
      if (result.error.statusCode === 403) {
        return { success: false, error: 'Perfil sem permissão para este tipo de saque' }
      }
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Erro ao processar solicitação'),
      }
    }

    revalidatePath(resolveRevalidatePath(validatedData.revalidate_path))

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }

    console.error('Withdrawal error:', error)
    return { success: false, error: 'Erro ao processar solicitação' }
  }
}
