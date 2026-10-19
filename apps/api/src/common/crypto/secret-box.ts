import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

/**
 * Cofre de segredos guardados no banco (ex.: o token do Mercado Pago colado no painel do admin):
 * AES-256-GCM, com a chave derivada (HKDF) de um segredo do servidor e de um "propósito", para a
 * mesma chave-mestra nunca cifrar duas coisas diferentes. Um backup do banco vazado não entrega o
 * segredo; trocar a chave-mestra obriga a cadastrar o segredo de novo.
 *
 * Formato gravado: `v1.<iv>.<tag>.<cifrado>` (base64url).
 */
const VERSION = 'v1'

export function deriveSecretKey(masterSecret: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterSecret, 'vox-secret-box', purpose, 32))
}

export function sealSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const sealed = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [VERSION, iv, cipher.getAuthTag(), sealed]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

/** `null` se o texto foi adulterado ou cifrado com outra chave (nunca devolve lixo). */
export function openSecret(stored: string, key: Buffer): string | null {
  const [version, iv, tag, sealed] = stored.split('.')
  if (version !== VERSION || !iv || !tag || sealed === undefined) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(sealed, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}
