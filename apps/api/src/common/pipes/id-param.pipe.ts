import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe.js'

/** Id numérico (bigint) vindo de rota ou query: inteiro positivo dentro do seguro. */
export const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER)

/** Uso: `@Param('id', IdParamPipe) id: number`. Texto, negativo ou gigante vira 400 (e não erro do banco). */
export const IdParamPipe = new ZodValidationPipe(idSchema)

/** Erro `unique_violation` (23505) do Postgres, venha direto ou dentro de `cause` (Drizzle). */
export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23505'
}

/** Erro `foreign_key_violation` (23503) do Postgres. */
export function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23503'
}

function pgErrorCode(error: unknown): string | undefined {
  const direct = (error as { code?: unknown } | null)?.code
  if (typeof direct === 'string') return direct
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  return typeof cause === 'string' ? cause : undefined
}
