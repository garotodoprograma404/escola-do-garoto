/**
 * Prepara o texto de busca do aluno para um `ILIKE '%…%' ESCAPE '\'`.
 *
 * 1. Normaliza (NFKC) ANTES de escapar: letras de largura total (％ ＿) viram `%` `_` na
 *    normalização e, se escapássemos antes, virariam curinga.
 * 2. Escapa `\`, `%` e `_` para a busca ser sempre "contém este texto".
 *
 * O valor vai como parâmetro (nunca concatenado em SQL).
 */
export function toContainsPattern(search: string): string {
  const normalized = search.normalize('NFKC').trim()
  return `%${normalized.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}
