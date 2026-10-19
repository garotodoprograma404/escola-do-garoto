import { randomInt } from 'node:crypto'

// Sem 0/O/1/I (ambíguos). 32 símbolos.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Formato do código público: PREFIXO-AAAA-XXXX-XXXX-XXXX (igual ao check do banco). O prefixo é a
 * marca da plataforma (`CERTIFICATE_CODE_PREFIX`, 2 a 8 letras; padrão `GAROTO`).
 */
export const CERTIFICATE_CODE_PATTERN = /^[A-Z]{2,8}-[0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/

function randomSegment(length: number): string {
  let value = ''
  for (let index = 0; index < length; index += 1) {
    value += ALPHABET[randomInt(ALPHABET.length)]
  }
  return value
}

/** Código imprevisível (usa `crypto.randomInt`, não `Math.random`): o código é a prova pública. */
export function generateCertificateCode(prefix: string, now: Date = new Date()): string {
  return `${prefix}-${now.getUTCFullYear()}-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`
}

/** Maiúsculas e sem espaços nas pontas, como a função SQL `verify_certificate_by_code`. */
export function normalizeCertificateCode(raw: string): string {
  return raw.trim().toUpperCase()
}
