import { useCallback, useEffect, useState, type RefObject } from 'react'
import type { PlayerLogger } from './usePlayerLogger'

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type MobileFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
}

type OrientationLockValue =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary'

function getActiveFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null
  const fullscreenDocument = document as FullscreenDocument
  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
}

function isShortLandscapeViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(orientation: landscape) and (max-height: 620px)').matches
}

function unlockOrientation() {
  if (typeof screen === 'undefined') return
  const orientation = (screen.orientation ?? null) as
    (ScreenOrientation & { unlock?: () => void }) | null
  if (!orientation) return

  try {
    orientation.unlock?.()
  } catch {
    // ignore orientation unlock errors
  }
}

/** No celular, ao entrar em tela cheia, tenta deitar a tela (nem todo navegador deixa). */
async function tryLockLandscape() {
  if (typeof window === 'undefined') return
  if (window.innerWidth >= 1024) return

  const orientation = (screen.orientation ?? null) as
    (ScreenOrientation & { lock?: (orientation: OrientationLockValue) => Promise<void> }) | null
  if (!orientation || typeof orientation.lock !== 'function') return

  try {
    await orientation.lock('landscape')
  } catch {
    // not all browsers allow runtime orientation lock
  }
}

async function exitFullscreen() {
  if (typeof document === 'undefined') return
  const fullscreenDocument = document as FullscreenDocument

  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }

  if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
    await Promise.resolve(fullscreenDocument.webkitExitFullscreen())
  }
}

/** Pede tela cheia para o elemento, no padrão ou no prefixo `webkit`. Devolve se algum funcionou. */
async function requestFullscreenOn(element: FullscreenElement | null): Promise<boolean> {
  if (!element) return false

  if (typeof element.requestFullscreen === 'function') {
    await element.requestFullscreen()
    await tryLockLandscape()
    return true
  }

  if (typeof element.webkitRequestFullscreen === 'function') {
    await Promise.resolve(element.webkitRequestFullscreen())
    await tryLockLandscape()
    return true
  }

  return false
}

interface PlayerFullscreenParams {
  mode: 'direct_video' | 'youtube' | 'vimeo' | 'invalid'
  frameRef: RefObject<HTMLDivElement | null>
  videoRef: RefObject<HTMLVideoElement | null>
  vimeoIframeRef: RefObject<HTMLIFrameElement | null>
  youtubeContainerRef: RefObject<HTMLDivElement | null>
  logPlayerEvent: PlayerLogger
}

/** Tela cheia do player (com os prefixos de Safari/iOS) e detecção de celular deitado com pouca altura. */
export function usePlayerFullscreen({
  mode,
  frameRef,
  videoRef,
  vimeoIframeRef,
  youtubeContainerRef,
  logPlayerEvent,
}: PlayerFullscreenParams) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isShortLandscape, setIsShortLandscape] = useState(false)

  useEffect(() => {
    const updateViewportState = () => setIsShortLandscape(isShortLandscapeViewport())

    updateViewportState()
    window.addEventListener('resize', updateViewportState)
    window.addEventListener('orientationchange', updateViewportState)

    return () => {
      window.removeEventListener('resize', updateViewportState)
      window.removeEventListener('orientationchange', updateViewportState)
    }
  }, [])

  const syncFullscreenState = useCallback(() => {
    const fullscreenElement = getActiveFullscreenElement()
    const frame = frameRef.current

    if (!fullscreenElement || !frame) {
      setIsFullscreen(false)
      unlockOrientation()
      return
    }

    const isFrameInFullscreen =
      fullscreenElement === frame ||
      (fullscreenElement instanceof HTMLElement && frame.contains(fullscreenElement))

    setIsFullscreen(isFrameInFullscreen)

    if (!isFrameInFullscreen) {
      unlockOrientation()
    }
  }, [frameRef])

  useEffect(() => {
    syncFullscreenState()

    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('webkitfullscreenchange', syncFullscreenState as EventListener)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState as EventListener)
    }
  }, [syncFullscreenState])

  const enterFullscreen = useCallback(async () => {
    if (await requestFullscreenOn(frameRef.current)) return

    if (mode === 'youtube') {
      const iframe = youtubeContainerRef.current?.querySelector(
        'iframe',
      ) as FullscreenElement | null
      if (await requestFullscreenOn(iframe)) return
    }

    if (mode === 'vimeo') {
      if (await requestFullscreenOn(vimeoIframeRef.current)) return
    }

    if (mode === 'direct_video') {
      // iPhone: só o próprio <video> entra em tela cheia.
      const nativeVideo = videoRef.current as MobileFullscreenVideo | null
      if (nativeVideo && typeof nativeVideo.webkitEnterFullscreen === 'function') {
        nativeVideo.webkitEnterFullscreen()
      }
    }
  }, [frameRef, mode, videoRef, vimeoIframeRef, youtubeContainerRef])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (isFullscreen) {
        await exitFullscreen()
        unlockOrientation()
        logPlayerEvent('info', 'fullscreen_exit')
        return
      }

      await enterFullscreen()
      logPlayerEvent('info', 'fullscreen_enter')
    } catch (error) {
      logPlayerEvent('error', 'fullscreen_toggle_failed', { error })
    }
  }, [enterFullscreen, isFullscreen, logPlayerEvent])

  return { isFullscreen, isShortLandscape, toggleFullscreen }
}
