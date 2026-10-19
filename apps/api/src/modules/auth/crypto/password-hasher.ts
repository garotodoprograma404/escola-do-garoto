import { argon2, randomBytes, timingSafeEqual, type Argon2Parameters } from 'node:crypto'

/**
 * Hash de senha com Argon2id, usando a implementação nativa do Node (>= 24.7).
 *
 * O resultado é gravado no formato PHC, o mesmo das bibliotecas argon2 de outras linguagens:
 *   $argon2id$v=19$m=19456,t=2,p=1$<salt base64>$<hash base64>
 * Assim os parâmetros ficam junto do hash e podem ser endurecidos no futuro sem quebrar
 * as senhas antigas (`needsRehash` avisa quando vale regravar).
 *
 * Parâmetros: mínimo recomendado pela OWASP (19 MiB, 2 passadas, paralelismo 1).
 */
const ARGON2_PARAMS = { memory: 19_456, passes: 2, parallelism: 1 } as const

const SALT_BYTES = 16
const HASH_BYTES = 32
const PHC_PATTERN =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/

type Argon2Cost = { memory: number; passes: number; parallelism: number }

function deriveKey(
  password: string,
  salt: Buffer,
  cost: Argon2Cost,
  tagLength: number,
): Promise<Buffer> {
  const params: Argon2Parameters = { message: password, nonce: salt, tagLength, ...cost }
  return new Promise((resolve, reject) => {
    argon2('argon2id', params, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

const toB64 = (buf: Buffer) => buf.toString('base64').replace(/=+$/, '')
const fromB64 = (value: string) => Buffer.from(value, 'base64')

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const key = await deriveKey(password, salt, ARGON2_PARAMS, HASH_BYTES)
  const { memory, passes, parallelism } = ARGON2_PARAMS
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${toB64(salt)}$${toB64(key)}`
}

/** Compara em tempo constante. Hash malformado conta como senha errada (nunca lança). */
export async function verifyPassword(password: string, phc: string): Promise<boolean> {
  const match = PHC_PATTERN.exec(phc)
  if (!match) return false
  const [, memory, passes, parallelism, salt, hash] = match
  const expected = fromB64(hash)
  const actual = await deriveKey(
    password,
    fromB64(salt),
    { memory: Number(memory), passes: Number(passes), parallelism: Number(parallelism) },
    expected.length,
  )
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** true quando o hash foi gerado com parâmetros mais fracos que os atuais. */
export function needsRehash(phc: string): boolean {
  const match = PHC_PATTERN.exec(phc)
  if (!match) return true
  const [, memory, passes, parallelism] = match.map(Number)
  return (
    memory < ARGON2_PARAMS.memory ||
    passes < ARGON2_PARAMS.passes ||
    parallelism !== ARGON2_PARAMS.parallelism
  )
}
