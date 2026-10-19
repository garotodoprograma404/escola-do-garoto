/**
 * CSV do relatório financeiro. Duas proteções:
 *
 * - aspas e quebras de linha dentro do texto não "vazam" para outra coluna;
 * - texto que começa com `= + - @` (ou tab/CR) ganha um apóstrofo na frente: nome de usuário e título de
 *   curso são texto livre de terceiros, e a planilha trataria isso como FÓRMULA (CSV injection).
 */
const FORMULA_START = /^[=+\-@\t\r]/

export function csvText(value: string | null | undefined): string {
  let text = value ?? ''
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Número em formato de planilha (ponto decimal, duas casas). Nunca recebe o tratamento de fórmula. */
export function csvNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

export function csvRow(cells: Array<string | number>): string {
  return cells.map((cell) => (typeof cell === 'number' ? csvNumber(cell) : csvText(cell))).join(',')
}
