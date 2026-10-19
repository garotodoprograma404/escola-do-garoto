/** Segundos como `m:ss` (valor inválido vira `0:00`). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** JSON do log do player; troca ciclos por `[Circular]` e nunca lança. */
export function serializePlayerLogPayload(payload: Record<string, unknown>): string {
  const seen = new WeakSet<object>()

  try {
    return JSON.stringify(payload, (_key, value: unknown) => {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        }
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value as object)) return '[Circular]'
        seen.add(value as object)
      }

      return value
    })
  } catch {
    return JSON.stringify({
      event: payload.event ?? 'unknown',
      lessonId: payload.lessonId ?? null,
      sourceMode: payload.sourceMode ?? null,
      sourceUrl: payload.sourceUrl ?? null,
      serializationError: true,
    })
  }
}

/** Log de progresso: a cada segundo até 30 s, depois a cada 10 s (evita inundar o console). */
export function shouldEmitProgressTick(
  currentSecondFloor: number,
  lastLoggedSecond: number,
): boolean {
  if (currentSecondFloor < 0) return false

  if (currentSecondFloor <= 30) {
    return currentSecondFloor !== lastLoggedSecond
  }

  return currentSecondFloor - lastLoggedSecond >= 10
}
