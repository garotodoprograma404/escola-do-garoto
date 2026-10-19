import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import {
  ALL_BUCKETS,
  EXTENSION_BY_MIME,
  PUBLIC_BUCKETS,
  UPLOAD_RULES,
  type Bucket,
  type UploadType,
} from './file-types.js'
import { LocalDiskStorage, type FileStorage } from './storage.js'

/** Assinaturas (primeiros bytes) dos formatos que dá para conferir com segurança. */
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/png': (b) =>
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')),
  'image/webp': (b) =>
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
}

/** Tipos sem assinatura conhecida aqui (Office, zip, svg, ico) seguem só pela regra de tipo/papel. */
function matchesSignature(mimetype: string, buffer: Buffer): boolean {
  const check = SIGNATURES[mimetype]
  return check ? check(buffer) : true
}

export type StoredFile = { bucket: Bucket; path: string; url: string }

/**
 * Arquivos enviados. Buckets: `public` e `thumbnails` (qualquer pessoa
 * baixa pela URL), `documents` e `certificates` (privados: só por URL assinada, com validade).
 * Outros módulos usam este service (ex.: certificados gravam o PDF e pedem a URL assinada).
 */
@Injectable()
export class FilesService {
  private readonly storage: FileStorage
  private readonly signingSecret: string

  constructor(@Inject(ENV) env: Env) {
    this.storage = new LocalDiskStorage(env.FILES_DIR)
    // Sem segredo configurado (só possível fora de produção): um aleatório por execução.
    this.signingSecret = env.FILES_SIGNING_SECRET ?? randomBytes(32).toString('hex')
  }

  /** URL pública (só para buckets públicos). Relativa: o Next repassa `/api/*` para a API. */
  publicUrl(bucket: Bucket, path: string): string {
    return `/api/files/public/${bucket}/${path}`
  }

  /** Valida o arquivo pelas regras do tipo de upload e grava. O nome final nunca vem do cliente. */
  async upload(
    user: SessionUser,
    type: UploadType,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<StoredFile> {
    const rule = UPLOAD_RULES[type]
    if (rule.roles && !rule.roles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Você não tem permissão para enviar este tipo de arquivo')
    }
    if (!rule.mimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos aceitos: ${rule.mimeTypes.join(', ')}`,
      )
    }
    if (file.size > rule.maxBytes) {
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${Math.round(rule.maxBytes / 1024 / 1024)}MB`,
      )
    }

    if (!matchesSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('O conteúdo do arquivo não corresponde ao tipo informado')
    }

    const extension = EXTENSION_BY_MIME[file.mimetype] ?? 'bin'
    const path = `${rule.folder}/${user.id}/${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`
    await this.putObject(rule.bucket, path, file.buffer)
    return { bucket: rule.bucket, path, url: this.publicUrl(rule.bucket, path) }
  }

  async putObject(bucket: Bucket, path: string, body: Buffer): Promise<void> {
    this.assertValid(bucket, path)
    await this.storage.put(`${bucket}/${path}`, body)
  }

  async removeObject(bucket: Bucket, path: string): Promise<void> {
    this.assertValid(bucket, path)
    await this.storage.remove(`${bucket}/${path}`)
  }

  async openObject(bucket: Bucket, path: string) {
    this.assertValid(bucket, path)
    return this.storage.open(`${bucket}/${path}`)
  }

  isPublicBucket(bucket: string): bucket is Bucket {
    return (PUBLIC_BUCKETS as readonly string[]).includes(bucket)
  }

  /** Link temporário para baixar um arquivo privado (`ttlSeconds` padrão: 10 min). */
  signedUrl(bucket: Bucket, path: string, ttlSeconds = 600): string {
    this.assertValid(bucket, path)
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds
    const signature = this.sign(bucket, path, expires)
    return `/api/files/signed/${bucket}/${path}?expires=${expires}&sig=${signature}`
  }

  verifySignature(bucket: string, path: string, expires: number, signature: string): boolean {
    if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false
    if (!this.isValidBucket(bucket)) return false
    const expected = Buffer.from(this.sign(bucket, path, expires))
    const received = Buffer.from(signature)
    return expected.length === received.length && timingSafeEqual(expected, received)
  }

  private sign(bucket: string, path: string, expires: number): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${bucket}\n${path}\n${expires}`)
      .digest('hex')
  }

  private isValidBucket(bucket: string): bucket is Bucket {
    return (ALL_BUCKETS as readonly string[]).includes(bucket)
  }

  /** Bucket conhecido e caminho sem `..`, sem barra inicial e sem caracteres estranhos. */
  private assertValid(bucket: string, path: string): asserts bucket is Bucket {
    if (!this.isValidBucket(bucket)) throw new BadRequestException('Bucket inválido')
    const safe =
      /^[A-Za-z0-9_\-./]+$/.test(path) &&
      !path.split('/').some((part) => part === '..' || part === '')
    if (!safe || path.length > 300) throw new BadRequestException('Caminho de arquivo inválido')
  }
}
