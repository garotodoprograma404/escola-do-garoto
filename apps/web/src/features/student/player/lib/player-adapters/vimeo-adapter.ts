import type {
  EmbeddedPlayerController,
  EmbeddedPlayerError,
  EmbeddedPlayerEventHandlers,
} from './types'

interface VimeoLoadedPayload {
  duration?: number
}

interface VimeoTimeUpdatePayload {
  seconds?: number
  duration?: number
  percent?: number
}

interface VimeoErrorPayload {
  name?: string
  message?: string
}

interface VimeoPlayerApi {
  on: (event: string, callback: (payload: unknown) => void) => void
  off?: (event: string, callback: (payload: unknown) => void) => void
  setCurrentTime: (seconds: number) => Promise<number>
  destroy: () => Promise<void>
}

declare global {
  interface Window {
    Vimeo?: {
      Player: new (
        element: HTMLElement | HTMLIFrameElement,
        options?: Record<string, unknown>,
      ) => VimeoPlayerApi
    }
  }
}

const VIMEO_PLAYER_SCRIPT_SRC = 'https://player.vimeo.com/api/player.js'
const VIMEO_FATAL_ERROR_NAMES = new Set(['PasswordError', 'PrivacyError', 'NotFoundError'])
const VIMEO_FATAL_MESSAGE_PATTERNS = [
  /private/i,
  /password/i,
  /does not exist/i,
  /not found/i,
  /embed(?:ding)?\s+disabled/i,
  /cannot be played/i,
  /forbidden/i,
]

let vimeoScriptPromise: Promise<void> | null = null

function loadVimeoPlayerScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.Vimeo?.Player) return Promise.resolve()
  if (vimeoScriptPromise) return vimeoScriptPromise

  vimeoScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-vimeo-player-api="true"]',
    )

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve()
        return
      }
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Vimeo API')),
        {
          once: true,
        },
      )
      return
    }

    const script = document.createElement('script')
    script.src = VIMEO_PLAYER_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.setAttribute('data-vimeo-player-api', 'true')
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Vimeo API'))
    document.body.appendChild(script)
  })

  return vimeoScriptPromise
}

interface CreateVimeoPlayerAdapterOptions extends EmbeddedPlayerEventHandlers {
  iframe: HTMLIFrameElement
}

export function shouldTreatVimeoErrorAsFatal(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false

  const error = payload as VimeoErrorPayload
  const name = typeof error.name === 'string' ? error.name : ''
  if (VIMEO_FATAL_ERROR_NAMES.has(name)) {
    return true
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''
  if (!message) return false

  return VIMEO_FATAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))
}

function parseVimeoError(payload: unknown): EmbeddedPlayerError {
  const fatal = shouldTreatVimeoErrorAsFatal(payload)
  const normalized = payload && typeof payload === 'object' ? (payload as VimeoErrorPayload) : {}

  return {
    provider: 'vimeo',
    fatal,
    name: typeof normalized.name === 'string' ? normalized.name : undefined,
    message: typeof normalized.message === 'string' ? normalized.message : undefined,
    raw: payload,
  }
}

export async function createVimeoPlayerAdapter({
  iframe,
  onLoaded,
  onTimeUpdate,
  onEnded,
  onError,
}: CreateVimeoPlayerAdapterOptions): Promise<EmbeddedPlayerController> {
  await loadVimeoPlayerScript()

  if (!window.Vimeo?.Player) {
    throw new Error('Vimeo API not available after script load')
  }

  const player = new window.Vimeo.Player(iframe, {
    autoplay: false,
    byline: false,
    title: false,
    portrait: false,
    controls: true,
    dnt: true,
  })

  const handleLoaded = (payload: unknown) => {
    const loaded = payload as VimeoLoadedPayload
    const duration =
      typeof loaded.duration === 'number' && Number.isFinite(loaded.duration) ? loaded.duration : 0

    if (duration > 0) {
      onLoaded(duration)
    }
  }

  const handleTimeUpdate = (payload: unknown) => {
    const timeUpdate = payload as VimeoTimeUpdatePayload
    const seconds =
      typeof timeUpdate.seconds === 'number' && Number.isFinite(timeUpdate.seconds)
        ? timeUpdate.seconds
        : 0
    const duration =
      typeof timeUpdate.duration === 'number' && Number.isFinite(timeUpdate.duration)
        ? timeUpdate.duration
        : 0
    const percent =
      typeof timeUpdate.percent === 'number' && Number.isFinite(timeUpdate.percent)
        ? timeUpdate.percent
        : duration > 0
          ? seconds / duration
          : 0

    onTimeUpdate({
      seconds,
      duration,
      percent,
    })
  }

  const handleEnded = () => {
    onEnded()
  }

  const handleError = (payload: unknown) => {
    onError(parseVimeoError(payload))
  }

  player.on('loaded', handleLoaded)
  player.on('timeupdate', handleTimeUpdate)
  player.on('ended', handleEnded)
  player.on('error', handleError)

  return {
    seekTo: async (seconds: number) => {
      await player.setCurrentTime(seconds)
    },
    destroy: async () => {
      if (typeof player.off === 'function') {
        player.off('loaded', handleLoaded)
        player.off('timeupdate', handleTimeUpdate)
        player.off('ended', handleEnded)
        player.off('error', handleError)
      }

      await player.destroy()
    },
  }
}
