// =====================================================
// GENERATE INVOICE - SERVER ACTION
// =====================================================

'use server'

import { downloadInvoiceAction } from './download-invoice'

/**
 * Comprovante da compra: gera na hora se ainda não existe e devolve o endereço para baixar.
 */
export async function generateInvoiceAction(
  transactionId: string,
): Promise<{ success: boolean; pdfUrl?: string; filename?: string; message?: string }> {
  const result = await downloadInvoiceAction(transactionId)

  if ('error' in result) {
    return { success: false, message: result.error }
  }

  return { success: true, pdfUrl: result.url, filename: result.filename }
}
