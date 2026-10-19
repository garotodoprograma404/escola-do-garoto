import { useCallback } from 'react'
import { serializePlayerLogPayload } from '../lib/player-utils'

export type PlayerLogger = (
  level: 'info' | 'warn' | 'error',
  event: string,
  data?: Record<string, unknown>,
) => void

/** Log do player no console, sempre com aula, tipo de fonte e URL para facilitar o suporte. */
export function usePlayerLogger(lessonId: number, sourceMode: string, url: string): PlayerLogger {
  return useCallback(
    (level, event, data = {}) => {
      const serialized = serializePlayerLogPayload({
        ts: new Date().toISOString(),
        event,
        lessonId,
        sourceMode,
        sourceUrl: url,
        ...data,
      })

      if (level === 'error') {
        console.error(`[player][error] ${serialized}`)
        return
      }

      if (level === 'warn') {
        console.warn(`[player][warn] ${serialized}`)
        return
      }

      console.warn(`[player][info] ${serialized}`)
    },
    [lessonId, sourceMode, url],
  )
}
