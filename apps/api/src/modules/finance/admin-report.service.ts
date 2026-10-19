import { Inject, Injectable } from '@nestjs/common'
import { AdminFinanceService } from './admin-finance.service.js'
import { csvRow } from './report-csv.js'
import type { ReportQuery } from './finance.schemas.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
/** Um relatório tem no máximo isto de linhas (evita um período gigante derrubar o servidor). */
const MAX_REPORT_ROWS = 20_000

const TYPE_LABEL: Record<string, string> = {
  sale: 'venda',
  withdrawal: 'saque',
  refund: 'reembolso',
  commission: 'comissão',
  affiliate_commission: 'comissão de afiliado',
  anticipation: 'antecipação',
}

/**
 * Relatório financeiro do admin. PDF e Excel ainda não existem; o formato pedido só muda a extensão sugerida, e o conteúdo é sempre CSV.
 */
@Injectable()
export class AdminReportService {
  constructor(@Inject(AdminFinanceService) private readonly finance: AdminFinanceService) {}

  async buildCsv(query: ReportQuery): Promise<{ filename: string; content: string }> {
    // O período é de dias inteiros no fuso do Brasil: vai do começo do primeiro ao fim do último.
    const from = new Date(`${query.dateFrom}T00:00:00-03:00`)
    const to = new Date(new Date(`${query.dateTo}T00:00:00-03:00`).getTime() + ONE_DAY_MS)

    const [metrics, transactions, withdrawals] = await Promise.all([
      this.finance.getFinancialMetrics(),
      this.finance.getTransactions({ from, to, limit: MAX_REPORT_ROWS }),
      this.finance.getWithdrawalRequests({
        status: 'ALL',
        producerId: 'ALL',
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      }),
    ])

    // Receita do PERÍODO = o que os alunos pagaram (transação agregada do checkout).
    const periodRevenue = transactions
      .filter(
        (tx) =>
          tx.type === 'sale' &&
          tx.status === 'completed' &&
          tx.description.startsWith('Checkout do aluno'),
      )
      .reduce((sum, tx) => sum + tx.amount, 0)

    const lines = [
      csvRow(['Período', `${query.dateFrom} a ${query.dateTo}`]),
      csvRow(['Receita no período', periodRevenue]),
      csvRow(['Receita total (todo o histórico)', metrics.totalRevenue]),
      csvRow(['Saques solicitados no período', String(withdrawals.length)]),
      '',
      csvRow(['Data', 'Tipo', 'Descrição', 'Usuário', 'Valor']),
      ...transactions.map((tx) =>
        csvRow([
          new Date(tx.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          TYPE_LABEL[tx.type] ?? tx.type,
          tx.description,
          tx.userName,
          tx.amount,
        ]),
      ),
    ]
    return {
      filename: `relatorio-financeiro-${query.dateFrom}-${query.dateTo}.csv`,
      // BOM para o Excel abrir os acentos certo.
      content: `﻿${lines.join('\r\n')}\r\n`,
    }
  }
}
