'use server'

import { apiServer } from '@/lib/server-api'

interface InvoiceResponse {
  success: true
  url: string
  filename: string
}

/**
 * Gera (se ainda não existe) o comprovante de uma compra DESTA pessoa e devolve o endereço do
 * download. A API confere o dono da transação e monta o HTML com todo texto escapado (sem script
 * injetado via título de curso).
 */
export async function downloadInvoiceAction(
  transactionId: string,
): Promise<{ success: true; url: string; filename: string } | { error: string }> {
  try {
    const id = String(transactionId || '').trim()
    if (!/^\d{1,15}$/.test(id)) return { error: 'Transação não encontrada' }

    const result = await apiServer<InvoiceResponse>(`/finance/student/transactions/${id}/invoice`, {
      method: 'POST',
    })

    if (!result.ok) {
      return {
        error:
          result.error.statusCode === 401
            ? 'Você precisa estar logado'
            : result.error.message || 'Erro ao baixar nota fiscal',
      }
    }

    return { success: true, url: result.data.url, filename: result.data.filename }
  } catch (error: unknown) {
    console.error('Error downloading invoice:', error)
    return { error: 'Erro ao baixar nota fiscal' }
  }
}
