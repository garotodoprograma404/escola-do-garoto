import { useEffect, useRef, type RefObject } from 'react'
import {
  createVimeoPlayerAdapter,
  createYouTubePlayerAdapter,
  type EmbeddedPlayerController,
  type EmbeddedPlayerError,
  type EmbeddedTimeUpdate,
} from '../lib/player-adapters'
import { shouldEmitProgressTick } from '../lib/player-utils'
import type { ResolvedVideoSource } from '../lib/video-source'
import type { PlaybackTracking } from './usePlaybackTracking'
import type { PlayerLogger } from './usePlayerLogger'

interface EmbeddedPlayerParams {
  source: ResolvedVideoSource
  lessonId: number
  vimeoIframeRef: RefObject<HTMLIFrameElement | null>
  youtubeContainerRef: RefObject<HTMLDivElement | null>
  tracking: PlaybackTracking
  logPlayerEvent: PlayerLogger
}

/**
 * Liga o player do YouTube/Vimeo à aula: aplica o ponto onde o aluno parou, acompanha o tempo,
 * grava o progresso, conclui a aula aos 90% e avisa se o vídeo parou de mandar eventos.
 * Para vídeo direto (arquivo) não faz nada.
 */
export function useEmbeddedPlayer({
  source,
  lessonId,
  vimeoIframeRef,
  youtubeContainerRef,
  tracking,
  logPlayerEvent,
}: EmbeddedPlayerParams) {
  const embeddedPlayerRef = useRef<EmbeddedPlayerController | null>(null)
  const {
    setDuration,
    setCurrentTime,
    setHasPlaybackError,
    lastSavedSecondRef,
    initialProgressAppliedRef,
    onProgressRef,
    durationRef,
    currentTimeRef,
    lastObservedSecondRef,
    lastProgressTickLogRef,
    lastEmbeddedTimeUpdateAtRef,
    stallGapLoggedRef,
    hasPlaybackErrorRef,
    initialProgressRef,
    persistWatchProgress,
    completeLesson,
  } = tracking

  useEffect(() => {
    const existingPlayer = embeddedPlayerRef.current
    if (existingPlayer) {
      void existingPlayer.destroy().catch(() => undefined)
      embeddedPlayerRef.current = null
    }

    const isEmbeddedProvider = source.mode === 'vimeo' || source.mode === 'youtube'
    if (!isEmbeddedProvider) return

    logPlayerEvent('info', 'embedded_init', {
      provider: source.mode,
      playbackUrl: source.playbackUrl,
      providerVideoId: source.providerVideoId ?? null,
    })

    let isCancelled = false
    let localPlayer: EmbeddedPlayerController | null = null
    let stallCheckIntervalId: number | null = null

    const registerInitialProgress = (seconds: number) => {
      lastSavedSecondRef.current = Math.floor(seconds)
      setCurrentTime(seconds)
      currentTimeRef.current = seconds
      onProgressRef.current?.(seconds)
      initialProgressAppliedRef.current = true
    }

    const applyInitialProgressForEmbedded = () => {
      const resumeSeconds = initialProgressRef.current
      if (!resumeSeconds || resumeSeconds <= 0 || initialProgressAppliedRef.current) return
      if (!localPlayer) return

      logPlayerEvent('info', 'embedded_initial_seek_requested', {
        targetSeconds: resumeSeconds,
      })

      void localPlayer
        .seekTo(resumeSeconds)
        .then(() => {
          if (isCancelled) return
          registerInitialProgress(resumeSeconds)
          logPlayerEvent('info', 'embedded_initial_seek_applied', {
            appliedSeconds: resumeSeconds,
          })
        })
        .catch((error) => {
          logPlayerEvent('warn', 'embedded_initial_seek_failed', {
            targetSeconds: resumeSeconds,
            error,
          })
        })
    }

    const handleLoaded = (loadedDuration: number) => {
      if (isCancelled) return

      logPlayerEvent('info', 'embedded_loaded', {
        provider: source.mode,
        duration: loadedDuration,
      })

      if (loadedDuration > 0) {
        setDuration(loadedDuration)
        durationRef.current = loadedDuration
      }

      applyInitialProgressForEmbedded()
    }

    const handleTimeUpdate = (timeUpdate: EmbeddedTimeUpdate) => {
      if (isCancelled) return

      const previousSeconds = lastObservedSecondRef.current
      const secondsDelta = timeUpdate.seconds - previousSeconds
      if (previousSeconds > 0 && Math.abs(secondsDelta) >= 8) {
        logPlayerEvent('info', 'embedded_seek_detected', {
          provider: source.mode,
          fromSeconds: previousSeconds,
          toSeconds: timeUpdate.seconds,
          deltaSeconds: secondsDelta,
        })
      }
      lastObservedSecondRef.current = timeUpdate.seconds
      lastEmbeddedTimeUpdateAtRef.current = Date.now()
      stallGapLoggedRef.current = false

      const currentSecondFloor = Math.floor(timeUpdate.seconds)
      if (shouldEmitProgressTick(currentSecondFloor, lastProgressTickLogRef.current)) {
        lastProgressTickLogRef.current = currentSecondFloor
        logPlayerEvent('info', 'embedded_progress_tick', {
          provider: source.mode,
          seconds: timeUpdate.seconds,
          duration: timeUpdate.duration,
          percent: timeUpdate.percent,
        })
      }

      setCurrentTime(timeUpdate.seconds)
      currentTimeRef.current = timeUpdate.seconds

      const currentDuration = timeUpdate.duration || durationRef.current
      if (currentDuration > 0) {
        setDuration(currentDuration)
        durationRef.current = currentDuration
      }

      persistWatchProgress(timeUpdate.seconds)

      if (timeUpdate.percent >= 0.9) {
        completeLesson(timeUpdate.seconds)
      }
    }

    const handleEnded = () => {
      if (isCancelled) return
      logPlayerEvent('info', 'embedded_ended', {
        provider: source.mode,
        seconds: currentTimeRef.current,
        duration: durationRef.current,
      })
      completeLesson(durationRef.current || currentTimeRef.current)
    }

    const handleError = (error: EmbeddedPlayerError) => {
      if (isCancelled) return

      logPlayerEvent(error.fatal ? 'error' : 'warn', 'embedded_error', {
        provider: error.provider,
        fatal: error.fatal,
        code: error.code ?? null,
        name: error.name ?? null,
        message: error.message ?? null,
        raw: error.raw ?? null,
      })

      if (error.fatal) {
        setHasPlaybackError(true)
      }
    }

    void (async () => {
      try {
        if (source.mode === 'vimeo') {
          const iframeElement = vimeoIframeRef.current
          if (!iframeElement) {
            logPlayerEvent('warn', 'embedded_mount_missing', { provider: source.mode })
            return
          }

          localPlayer = await createVimeoPlayerAdapter({
            iframe: iframeElement,
            onLoaded: handleLoaded,
            onTimeUpdate: handleTimeUpdate,
            onEnded: handleEnded,
            onError: handleError,
          })
        } else if (source.mode === 'youtube') {
          const youtubeContainerElement = youtubeContainerRef.current
          if (!youtubeContainerElement || !source.providerVideoId) {
            logPlayerEvent('warn', 'embedded_mount_missing', {
              provider: source.mode,
              hasContainer: Boolean(youtubeContainerElement),
              hasProviderVideoId: Boolean(source.providerVideoId),
            })
            return
          }

          localPlayer = await createYouTubePlayerAdapter({
            container: youtubeContainerElement,
            videoId: source.providerVideoId,
            startSeconds: source.startSeconds,
            onLoaded: handleLoaded,
            onTimeUpdate: handleTimeUpdate,
            onEnded: handleEnded,
            onError: handleError,
          })
        }

        if (!localPlayer) return

        if (isCancelled) {
          void localPlayer.destroy().catch(() => undefined)
          return
        }

        embeddedPlayerRef.current = localPlayer
        logPlayerEvent('info', 'embedded_adapter_ready', { provider: source.mode })
        applyInitialProgressForEmbedded()

        stallCheckIntervalId = window.setInterval(() => {
          if (isCancelled || hasPlaybackErrorRef.current || stallGapLoggedRef.current) return
          if (lastEmbeddedTimeUpdateAtRef.current <= 0) return

          const idleMs = Date.now() - lastEmbeddedTimeUpdateAtRef.current
          if (idleMs < 12_000) return

          stallGapLoggedRef.current = true
          logPlayerEvent('warn', 'embedded_timeupdate_gap_detected', {
            provider: source.mode,
            idleMs,
            currentSeconds: currentTimeRef.current,
            duration: durationRef.current,
          })
        }, 2_000)
      } catch (error) {
        if (isCancelled) return
        logPlayerEvent('error', 'embedded_bootstrap_failed', { provider: source.mode, error })
        setHasPlaybackError(true)
      }
    })()

    return () => {
      isCancelled = true
      if (stallCheckIntervalId !== null) {
        window.clearInterval(stallCheckIntervalId)
      }
      const playerToDestroy = localPlayer ?? embeddedPlayerRef.current
      if (!playerToDestroy) return

      if (embeddedPlayerRef.current === playerToDestroy) {
        embeddedPlayerRef.current = null
      }

      void playerToDestroy.destroy().catch(() => undefined)
    }
  }, [
    source.mode,
    source.playbackUrl,
    source.providerVideoId,
    source.startSeconds,
    lessonId,
    persistWatchProgress,
    completeLesson,
    logPlayerEvent,
    vimeoIframeRef,
    youtubeContainerRef,
    setDuration,
    setCurrentTime,
    setHasPlaybackError,
    lastSavedSecondRef,
    initialProgressAppliedRef,
    onProgressRef,
    durationRef,
    currentTimeRef,
    lastObservedSecondRef,
    lastProgressTickLogRef,
    lastEmbeddedTimeUpdateAtRef,
    stallGapLoggedRef,
    hasPlaybackErrorRef,
    initialProgressRef,
  ])
}
