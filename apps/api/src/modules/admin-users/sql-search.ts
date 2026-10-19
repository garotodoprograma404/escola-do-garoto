import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

const BACKSLASH = sql.raw(`'\\'`)
const DOUBLE_BACKSLASH = sql.raw(`'\\\\'`)
const ESCAPED_PERCENT = sql.raw(`'\\%'`)
const ESCAPED_UNDERSCORE = sql.raw(`'\\_'`)
const ESCAPE_CLAUSE = sql.raw(`ESCAPE '\\'`)

/**
 * "contém o texto" sem diferenciar maiúsculas, para busca digitada pelo usuário.
 *
 * A normalização (NFKC) acontece no BANCO e ANTES de escapar `\ % _`: sem isso, letras de largura
 * total (％ ＿ ＼) escapariam do escape e viravam curinga depois de normalizadas. O texto sempre
 * vai como parâmetro (nunca concatenado no SQL).
 */
export function likeContains(column: SQLWrapper, term: string): SQL {
  const normalizedTerm = sql`lower(normalize(${term}::text, NFKC))`
  const escapedTerm = sql`replace(replace(replace(${normalizedTerm}, ${BACKSLASH}, ${DOUBLE_BACKSLASH}), '%', ${ESCAPED_PERCENT}), '_', ${ESCAPED_UNDERSCORE})`
  return sql`lower(normalize(${column}::text, NFKC)) LIKE '%' || ${escapedTerm} || '%' ${ESCAPE_CLAUSE}`
}
