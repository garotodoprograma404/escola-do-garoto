'use server'

import { getCurrentUser } from '@/lib/session'

interface ExportReportInput {
  format: 'pdf' | 'excel'
  dateFrom: string
  dateTo: string
}

type ExportSuccess = {
  success: true
  /** Endereço do download (da própria API, com o cookie de sessão do admin). */
  url: string
  filename: string
}

type ExportFailure = {
  error: string
}

type ExportReportResult = ExportSuccess | ExportFailure

/**
 * Relatório financeiro do período. Quem monta o CSV é a API (`/api/admin/finance/report`, só
 * admin, com proteção contra fórmula em planilha) e o navegador baixa direto dela. PDF e Excel
 * ainda caem no CSV.
 */
export async function exportFinancialReportAction(
  input: ExportReportInput,
): Promise<ExportReportResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { error: 'Você precisa estar logado' }
    if (!user.roles.includes('admin')) {
      return { error: 'Acesso negado. Apenas administradores podem exportar relatórios.' }
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!datePattern.test(input.dateFrom) || !datePattern.test(input.dateTo)) {
      return { error: 'Selecione o período do relatório' }
    }
    if (input.dateFrom > input.dateTo) {
      return { error: 'A data inicial não pode ser depois da final' }
    }

    const params = new URLSearchParams({
      format: input.format,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    })
    return {
      success: true,
      url: `/api/admin/finance/report?${params.toString()}`,
      filename: `relatorio-financeiro-${input.dateFrom}-${input.dateTo}.csv`,
    }
  } catch (error: unknown) {
    console.error('Error exporting report:', error)
    return { error: error instanceof Error ? error.message : 'Erro ao exportar relatório' }
  }
}
