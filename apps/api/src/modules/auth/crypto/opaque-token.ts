import { createHash, randomBytes } from 'node:crypto'

/**
 * Tokens opacos (sessão, redefinição de senha).
 * O valor puro só existe no cookie/link do usuário; no banco guardamos apenas o SHA-256.
 * Se o banco vazar, ninguém consegue usar as sessões dele.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
