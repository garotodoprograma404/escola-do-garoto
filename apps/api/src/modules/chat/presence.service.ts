import { Injectable } from '@nestjs/common'

/** Sem conexão aberta, ainda conta como online por este tempo (reconexões e troca de página). */
const GRACE_MS = 45_000
/** Teto de streams abertos ao mesmo tempo por pessoa (abas): evita esgotar conexões da API. */
export const MAX_STREAMS_PER_USER = 6

/**
 * Quem está online = quem tem uma conexão de tempo real aberta (chat ou sino) agora, ou fechou há
 * poucos segundos. Em memória, como o barramento: vale para uma instância da API.
 */
@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, number>()
  private readonly lastSeen = new Map<string, number>()

  /** Registra uma conexão. Devolve a função que a encerra, ou `null` se passou do limite. */
  connect(userId: string): (() => void) | null {
    const current = this.connections.get(userId) ?? 0
    if (current >= MAX_STREAMS_PER_USER) return null
    this.connections.set(userId, current + 1)
    this.lastSeen.set(userId, Date.now())

    let closed = false
    return () => {
      if (closed) return
      closed = true
      const left = (this.connections.get(userId) ?? 1) - 1
      if (left <= 0) this.connections.delete(userId)
      else this.connections.set(userId, left)
      this.lastSeen.set(userId, Date.now())
      this.prune()
    }
  }

  /** Marca atividade (batimento do stream) sem abrir conexão nova. */
  touch(userId: string): void {
    this.lastSeen.set(userId, Date.now())
  }

  isOnline(userId: string): boolean {
    if ((this.connections.get(userId) ?? 0) > 0) return true
    const seen = this.lastSeen.get(userId)
    return seen !== undefined && Date.now() - seen < GRACE_MS
  }

  private prune(): void {
    if (this.lastSeen.size < 5000) return
    const limit = Date.now() - GRACE_MS
    for (const [userId, seen] of this.lastSeen) {
      if (seen < limit && !this.connections.has(userId)) this.lastSeen.delete(userId)
    }
  }
}
