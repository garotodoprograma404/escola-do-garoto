import { sql, type AnyColumn, type SQL } from 'drizzle-orm'

/**
 * Busca "contém" sem diferenciar maiúsculas: `coluna ILIKE %termo%`.
 *
 * O termo vai SEMPRE como parâmetro e é normalizado (NFKC) no banco ANTES de escapar `\ % _`:
 * escapar antes, em JavaScript, deixaria um "％" (largura total) digitado virar curinga quando
 * o banco o normalizasse. Montar o filtro concatenando o texto do usuário
 * (ex.: `.or('title.ilike.%${termo}%')`) permitiria injeção de filtro.
 */
export function likeContains(column: AnyColumn | SQL, term: string): SQL {
  return sql`${column} ilike '%' || replace(replace(replace(
    normalize(${term}, NFKC),
    chr(92), chr(92) || chr(92)),
    '%', chr(92) || '%'),
    '_', chr(92) || '_') || '%'`
}
