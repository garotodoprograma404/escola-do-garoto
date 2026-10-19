import { useCallback, useEffect, useRef, useState } from 'react'
import { saveProgressAction } from '../actions/save-progress'
import type { PlayerLogger } from './usePlayerLogger'

const DEFAULT_ASPECT_RATIO = 16 / 9

interface PlaybackTrackingParams {
  lessonId: number
  url: string
  initialProgress?: number
  onProgress?: (seconds: number) => void
  onComplete?: () => void
  logPlayerEvent: PlayerLogger
}

/**
 * Estado e registro do progresso de uma aula em vídeo: tempo e duração, erro de reprodução,
 * gravação do progresso na API (a cada 5 s) e conclusão da aula (uma vez por aula).
 * Os `ref`s espelham o estado para que os eventos do player leiam o valor atual sem recriar efeitos.
 */
export function usePlaybackTracking({
  lessonId,
  url,
  initialProgress,
  onProgress,
  onComplete,
  logPlayerEvent,
}: PlaybackTrackingParams) {
  const lastSavedSecondRef = useRef(0)
  const completedRef = useRef(false)
  const initialProgressAppliedRef = useRef(false)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  const durationRef = useRef(0)
  const currentTimeRef = useRef(0)
  const lastObservedSecondRef = useRef(0)
  const lastProgressErrorLogAtRef = useRef(0)
  const lastProgressTickLogRef = useRef(-1)
  const lastEmbeddedTimeUpdateAtRef = useRef(0)
  const stallGapLoggedRef = useRef(false)
  const hasPlaybackErrorRef = useRef(false)
  const initialProgressRef = useRef(initialProgress)

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [hasPlaybackError, setHasPlaybackError] = useState(false)
  const [mediaAspectRatio, setMediaAspectRatio] = useState(DEFAULT_ASPECT_RATIO)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    hasPlaybackErrorRef.current = hasPlaybackError
  }, [hasPlaybackError])

  useEffect(() => {
    initialProgressRef.current = initialProgress
  }, [initialProgress])

  // Trocou de aula ou de vídeo: recomeça do zero.
  useEffect(() => {
    setDuration(0)
    setCurrentTime(0)
    setHasPlaybackError(false)
    setMediaAspectRatio(DEFAULT_ASPECT_RATIO)
    lastSavedSecondRef.current = 0
    lastObservedSecondRef.current = 0
    lastProgressTickLogRef.current = -1
    lastEmbeddedTimeUpdateAtRef.current = 0
    stallGapLoggedRef.current = false
    completedRef.current = false
    initialProgressAppliedRef.current = false
    durationRef.current = 0
    currentTimeRef.current = 0
  }, [lessonId, url])

  const persistWatchProgress = useCallback(
    (seconds: number) => {
      const playbackSeconds = Math.max(0, Math.floor(seconds))
      if (playbackSeconds - lastSavedSecondRef.current < 5) return

      void saveProgressAction({
        lessonId,
        watchTimeSeconds: playbackSeconds,
      })
        .then((result) => {
          if (result.success) return

          const now = Date.now()
          if (now - lastProgressErrorLogAtRef.current < 15_000) return

          lastProgressErrorLogAtRef.current = now
          logPlayerEvent('warn', 'save_progress_failed', {
            watchTimeSeconds: playbackSeconds,
            reason: result.error ?? 'unknown',
          })
        })
        .catch((error) => {
          const now = Date.now()
          if (now - lastProgressErrorLogAtRef.current < 15_000) return

          lastProgressErrorLogAtRef.current = now
          logPlayerEvent('error', 'save_progress_exception', {
            watchTimeSeconds: playbackSeconds,
            error,
          })
        })

      lastSavedSecondRef.current = playbackSeconds
      onProgressRef.current?.(seconds)
    },
    [lessonId, logPlayerEvent],
  )

  const completeLesson = useCallback(
    (seconds: number) => {
      if (completedRef.current) return

      completedRef.current = true

      const watchTimeSeconds = Math.max(0, Math.floor(seconds))
      logPlayerEvent('info', 'lesson_completion_requested', { watchTimeSeconds })

      void saveProgressAction({ lessonId, watchTimeSeconds, completed: true })
        .then((result) => {
          if (result.success) return

          logPlayerEvent('warn', 'lesson_completion_save_failed', {
            watchTimeSeconds,
            reason: result.error ?? 'unknown',
          })
        })
        .catch((error) => {
          logPlayerEvent('error', 'lesson_completion_save_exception', { watchTimeSeconds, error })
        })

      onCompleteRef.current?.()
    },
    [lessonId, logPlayerEvent],
  )

  return {
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    hasPlaybackError,
    setHasPlaybackError,
    mediaAspectRatio,
    setMediaAspectRatio,
    lastSavedSecondRef,
    completedRef,
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
  }
}

export type PlaybackTracking = ReturnType<typeof usePlaybackTracking>
