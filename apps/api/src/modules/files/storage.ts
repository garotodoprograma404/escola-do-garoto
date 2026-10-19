import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import type { Readable } from 'node:stream'

/** Onde os bytes ficam. Hoje disco local; trocar por S3 é implementar esta interface. */
export interface FileStorage {
  put(key: string, body: Buffer): Promise<void>
  /** `null` se não existe. */
  open(key: string): Promise<{ stream: Readable; size: number } | null>
  remove(key: string): Promise<void>
}

export class LocalDiskStorage implements FileStorage {
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  /** Resolve a chave dentro da raiz; qualquer tentativa de sair dela (`..`) é recusada. */
  private pathFor(key: string): string {
    const full = resolve(this.root, key)
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error('Caminho de arquivo inválido')
    }
    return full
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.pathFor(key)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, body, { flag: 'wx' })
  }

  async open(key: string) {
    const full = this.pathFor(key)
    const info = await stat(full).catch(() => null)
    if (!info?.isFile()) return null
    return { stream: createReadStream(full), size: info.size }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true })
  }
}
