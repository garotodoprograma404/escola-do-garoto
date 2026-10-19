import type {
  EmbeddedPlayerController,
  EmbeddedPlayerError,
  EmbeddedPlayerEventHandlers,
} from './types'

interface YouTubePlayerState {
  ENDED: number
  PLAYING: number
}

interface YouTubePlayerApi {
  getCurrentTime: () => number
  getDuration: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  destroy: () => void
}

interface YouTubePlayerEvent {
  data: number
}

interface YouTubePlayerErrorEvent {
  data: number
}

interface YouTubePlayerOptions {
  width?: string
  height?: string
  videoId: string
  playerVars?: Record<string, unknown>
  events?: {
    onReady?: () => void
    onStateChange?: (event: YouTubePlayerEvent) => void
    onError?: (event: YouTubePlayerErrorEvent) => void
  }
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubePlayerApi
      PlayerState: YouTubePlayerState
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const YOUTUBE_IFRAME_API_SCRIPT_SRC = 'https://www.youtube.com/iframe_api'
const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Parâmetro inválido na requisição do vídeo',
  5: 'Falha do player HTML5 para reproduzir este vídeo',
  100: 'Vídeo não encontrado ou removido',
  101: 'Vídeo não permite reprodução incorporada',
  150: 'Vídeo não permite reprodução incorporada',
}

let youtubeApiPromise: Promise<void> | null = null

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-youtube-iframe-api="true"]',
    )

    const previousReadyHandler = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.()
      resolve()
    }

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true' && window.YT?.Player) {
        resolve()
        return
      }

      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load YouTube API')),
        {
          once: true,
        },
      )

      return
    }

    const script = document.createElement('script')
    script.src = YOUTUBE_IFRAME_API_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.setAttribute('data-youtube-iframe-api', 'true')
    script.onload = () => {
      script.dataset.loaded = 'true'
      if (window.YT?.Player) {
        resolve()
      }
    }
    script.onerror = () => reject(new Error('Failed to load YouTube API'))
    document.body.appendChild(script)
  })

  return youtubeApiPromise
}

interface CreateYouTubePlayerAdapterOptions extends EmbeddedPlayerEventHandlers {
  container: HTMLDivElement
  videoId: string
  startSeconds?: number
}

function toYouTubeEmbeddedError(event: YouTubePlayerErrorEvent | undefined): EmbeddedPlayerError {
  const code = typeof event?.data === 'number' ? event.data : undefined

  return {
    provider: 'youtube',
    fatal: true,
    code,
    message: code
      ? (YOUTUBE_ERROR_MESSAGES[code] ?? 'Erro de reprodução no YouTube')
      : 'Erro de reprodução no YouTube',
    raw: event,
  }
}

export async function createYouTubePlayerAdapter({
  container,
  videoId,
  startSeconds,
  onLoaded,
  onTimeUpdate,
  onEnded,
  onError,
}: CreateYouTubePlayerAdapterOptions): Promise<EmbeddedPlayerController> {
  await loadYouTubeIframeApi()

  if (!window.YT?.Player || !window.YT?.PlayerState) {
    throw new Error('YouTube API not available after script load')
  }

  let isDestroyed = false
  let timer: number | null = null
  let hasLoadedDuration = false

  const stopTimer = () => {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  const emitTimeUpdate = (player: YouTubePlayerApi) => {
    const seconds = player.getCurrentTime()
    const duration = player.getDuration()
    const percent = duration > 0 ? seconds / duration : 0

    if (!hasLoadedDuration && duration > 0) {
      hasLoadedDuration = true
      onLoaded(duration)
    }

    onTimeUpdate({ seconds, duration, percent })
  }

  const player = new window.YT.Player(container, {
    width: '100%',
    height: '100%',
    videoId,
    playerVars: {
      rel: 0,
      playsinline: 1,
      ...(startSeconds && startSeconds > 0 ? { start: startSeconds } : {}),
    },
    events: {
      onReady: () => {
        if (isDestroyed) return
        emitTimeUpdate(player)
      },
      onStateChange: (event) => {
        if (isDestroyed) return

        if (event.data === window.YT?.PlayerState.PLAYING) {
          stopTimer()
          timer = window.setInterval(() => emitTimeUpdate(player), 1000)
          emitTimeUpdate(player)
          return
        }

        stopTimer()

        if (event.data === window.YT?.PlayerState.ENDED) {
          emitTimeUpdate(player)
          onEnded()
        }
      },
      onError: (event) => {
        if (isDestroyed) return
        onError(toYouTubeEmbeddedError(event))
      },
    },
  })

  return {
    seekTo: async (seconds: number) => {
      if (isDestroyed) return
      player.seekTo(seconds, true)
      emitTimeUpdate(player)
    },
    destroy: async () => {
      isDestroyed = true
      stopTimer()
      player.destroy()
    },
  }
}
