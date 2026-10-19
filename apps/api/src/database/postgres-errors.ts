/** Códigos de erro do Postgres que tratamos de propósito. */
const UNIQUE_VIOLATION = '23505'

/** O Drizzle embrulha o erro do driver em `cause`; olhamos os dois níveis. */
export function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (e as { code?: unknown } | null)?.code
  return (
    code(error) === UNIQUE_VIOLATION ||
    code((error as { cause?: unknown })?.cause) === UNIQUE_VIOLATION
  )
}
