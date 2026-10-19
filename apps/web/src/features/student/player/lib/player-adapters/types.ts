export interface EmbeddedTimeUpdate {
  seconds: number
  duration: number
  percent: number
}

export interface EmbeddedPlayerError {
  provider: 'vimeo' | 'youtube'
  fatal: boolean
  code?: number | string
  name?: string
  message?: string
  raw?: unknown
}

export interface EmbeddedPlayerEventHandlers {
  onLoaded: (duration: number) => void
  onTimeUpdate: (update: EmbeddedTimeUpdate) => void
  onEnded: () => void
  onError: (error: EmbeddedPlayerError) => void
}

export interface EmbeddedPlayerController {
  seekTo: (seconds: number) => Promise<void>
  destroy: () => Promise<void>
}
