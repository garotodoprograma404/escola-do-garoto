import { and, eq, sql, type SQL, type SQLWrapper } from 'drizzle-orm'
import { courses } from '../../database/schema/index.js'
import { sanitizeLessonHtml } from '../learning/lesson-html.js'

/** Curso visível ao público: aprovado E publicado. */
export const isPublicCourse: SQL = and(
  eq(courses.status, 'approved'),
  eq(courses.isPublished, true),
)!

/**
 * Nota média do instrutor: média das notas dos cursos, pesada pelo número de avaliações de cada um
 * (agregação sobre `courses`; nula se nenhum curso tem avaliação).
 */
export const producerAverageRating = sql<number | null>`round(
  sum(${courses.averageRating} * ${courses.totalReviews})
  / nullif(sum(${courses.totalReviews}) filter (where ${courses.averageRating} is not null), 0), 2)::float8`

/**
 * Escapa `\`, `%` e `_` para usar o texto digitado dentro de um LIKE/ILIKE (com `ESCAPE '\'`).
 * Não há normalização no banco entre o escape e a comparação (sem `unaccent`), então escapar aqui
 * é seguro. Se um dia a busca passar a normalizar no banco, o escape tem que vir DEPOIS dela.
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`)
}

/** `%termo%` seguro, para "contém". */
export function containsPattern(term: string): string {
  return `%${escapeLike(term)}%`
}

/** `termo%` seguro, para "começa com". */
export function prefixPattern(term: string): string {
  return `${escapeLike(term)}%`
}

/** ILIKE com escape explícito. O padrão vai sempre como parâmetro (nunca concatenado). */
export function ilikeEscaped(column: SQLWrapper, pattern: string): SQL {
  return sql`${column} ilike ${pattern} escape '\\'`
}

/** Horas com uma casa decimal (3.5h). Sem duração, 0. */
export function minutesToHours(minutes: number | null | undefined): number {
  if (!minutes || minutes <= 0) return 0
  return Math.round((minutes / 60) * 10) / 10
}

/** Nota arredondada a uma casa decimal (4.3). */
export function roundRating(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Preço que a pessoa paga de fato: a promoção só vale se for maior que zero e menor que o preço
 * de tabela.
 */
export function resolveCurrentPrice(price: number, discountPrice: number | null): number {
  if (discountPrice !== null && discountPrice > 0 && discountPrice < price) return discountPrice
  return price
}

/** Nome de produtor mostrado ao público: `display_name` (se houver) ou o nome completo. */
export function producerDisplayName(
  profile: { displayName: string | null; fullName: string } | undefined,
  preferDisplayName: boolean,
): string {
  if (!profile) return 'Instrutor'
  const display = profile.displayName?.trim()
  if (preferDisplayName && display) return display
  return profile.fullName || display || 'Instrutor'
}

/** Lista de textos sem itens vazios nem puramente numéricos. */
export function normalizeStringList(value: string[] | null | undefined): string[] {
  return (value ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !/^\d+$/.test(item))
}

const SOCIAL_KEYS = ['website', 'instagram', 'youtube', 'linkedin', 'facebook'] as const
export type SocialLinks = Partial<Record<(typeof SOCIAL_KEYS)[number], string>>

/** Só as redes conhecidas, só texto, sem vazio (o jsonb do banco pode ter qualquer coisa). */
export function normalizeSocialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const links: SocialLinks = {}
  for (const key of SOCIAL_KEYS) {
    const raw = source[key]
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (trimmed.length > 0) links[key] = trimmed
  }
  return links
}

/**
 * Conteúdo de aula só vai para o público se a aula for PRÉVIA GRÁTIS. Devolver
 * `content_url`/`content_text` de todas as aulas para qualquer visitante deixaria o curso inteiro
 * à mostra: bastaria abrir o DevTools para assistir sem pagar.
 */
export function publicLessonContent(lesson: {
  isFreePreview: boolean
  contentUrl: string | null
  contentText: string | null
}): { content_url: string | null; content_text: string | null } {
  if (!lesson.isFreePreview) return { content_url: null, content_text: null }
  return { content_url: lesson.contentUrl, content_text: sanitizeLessonHtml(lesson.contentText) }
}
