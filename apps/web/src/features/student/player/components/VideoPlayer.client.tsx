// =====================================================
// VIDEO PLAYER - CLIENT COMPONENT
// Vídeo direto (arquivo) + YouTube/Vimeo, com registro do progresso.
// O estado do progresso, o player embutido e a tela cheia ficam em ../hooks.
// =====================================================

'use client'

import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { resolveVideoSource } from '../lib/video-source'
import { formatTime, shouldEmitProgressTick } from '../lib/player-utils'
import { useEmbeddedPlayer } from '../hooks/useEmbeddedPlayer'
import { usePlaybackTracking } from '../hooks/usePlaybackTracking'
import { usePlayerFullscreen } from '../hooks/usePlayerFullscreen'
import { usePlayerLogger } from '../hooks/usePlayerLogger'
import { PlaybackErrorOverlay } from './PlaybackErrorOverlay'
import { useStableCallback } from '@/shared/hooks/useStableCallback'

interface VideoPlayerProps {
  url: string
  lessonId: number
  initialProgress?: number
  onProgress?: (seconds: number) => void
  onComplete?: () => void
}

export function VideoPlayer({
  url,
  lessonId,
  initialProgress,
  onProgress,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerFrameRef = useRef<HTMLDivElement>(null)
  const vimeoIframeRef = useRef<HTMLIFrameElement>(null)
  const youtubeContainerRef = useRef<HTMLDivElement>(null)

  const resolvedSource = useMemo(() => resolveVideoSource(url), [url])
  const logPlayerEvent = usePlayerLogger(lessonId, resolvedSource.mode, url)

  useEffect(() => {
    logPlayerEvent('info', 'source_resolved', {
      playbackUrl: resolvedSource.playbackUrl,
      providerVideoId: resolvedSource.providerVideoId ?? null,
      startSeconds: resolvedSource.startSeconds ?? null,
    })
  }, [
    logPlayerEvent,
    resolvedSource.mode,
    resolvedSource.playbackUrl,
    resolvedSource.providerVideoId,
    resolvedSource.startSeconds,
  ])

  const tracking = usePlaybackTracking({
    lessonId,
    url,
    initialProgress,
    onProgress,
    onComplete,
    logPlayerEvent,
  })
  const {
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
    persistWatchProgress,
    completeLesson,
  } = tracking

  useEmbeddedPlayer({
    source: resolvedSource,
    lessonId,
    vimeoIframeRef,
    youtubeContainerRef,
    tracking,
    logPlayerEvent,
  })

  const { isFullscreen, isShortLandscape, toggleFullscreen } = usePlayerFullscreen({
    mode: resolvedSource.mode,
    frameRef: playerFrameRef,
    videoRef,
    vimeoIframeRef,
    youtubeContainerRef,
    logPlayerEvent,
  })

  /** Vídeo direto: pula para onde o aluno parou, assim que a duração é conhecida. */
  const applyInitialProgress = useStableCallback(() => {
    if (resolvedSource.mode !== 'direct_video') return
    if (!initialProgress || initialProgress <= 0 || initialProgressAppliedRef.current) return

    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    video.currentTime = Math.min(initialProgress, Math.max(video.duration - 1, 0))
    lastSavedSecondRef.current = Math.floor(video.currentTime)
    setCurrentTime(video.currentTime)
    currentTimeRef.current = video.currentTime
    onProgressRef.current?.(video.currentTime)
    initialProgressAppliedRef.current = true
  })

  // Reaplica ao trocar o ponto de retomada ou o tipo de fonte.
  useEffect(() => {
    applyInitialProgress()
  }, [initialProgress, resolvedSource.mode, applyInitialProgress])

  const handleVideoTimeUpdate = () => {
    if (resolvedSource.mode !== 'direct_video' || hasPlaybackError) return
    const video = videoRef.current
    if (!video) return

    const previousSeconds = lastObservedSecondRef.current
    const secondsDelta = video.currentTime - previousSeconds
    if (previousSeconds > 0 && Math.abs(secondsDelta) >= 8) {
      logPlayerEvent('info', 'direct_video_seek_detected', {
        fromSeconds: previousSeconds,
        toSeconds: video.currentTime,
        deltaSeconds: secondsDelta,
      })
    }
    lastObservedSecondRef.current = video.currentTime

    const currentSecondFloor = Math.floor(video.currentTime)
    if (shouldEmitProgressTick(currentSecondFloor, lastProgressTickLogRef.current)) {
      lastProgressTickLogRef.current = currentSecondFloor
      logPlayerEvent('info', 'direct_video_progress_tick', {
        seconds: video.currentTime,
        duration: video.duration || 0,
        percent: video.duration > 0 ? video.currentTime / video.duration : 0,
      })
    }

    setCurrentTime(video.currentTime)
    currentTimeRef.current = video.currentTime
    if (Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration)
      durationRef.current = video.duration
    }

    persistWatchProgress(video.currentTime)

    if (video.duration > 0 && video.currentTime / video.duration >= 0.9 && !completedRef.current) {
      completeLesson(video.currentTime)
    }
  }

  const handleVideoEnded = () => {
    if (resolvedSource.mode !== 'direct_video') return
    const video = videoRef.current
    const finalSecond = Math.floor(video?.duration || video?.currentTime || 0)
    logPlayerEvent('info', 'direct_video_ended', {
      seconds: video?.currentTime ?? 0,
      duration: video?.duration ?? 0,
    })
    completeLesson(finalSecond)
  }

  const handleVideoMetadataReady = () => {
    const video = videoRef.current
    if (!video) return

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setMediaAspectRatio(video.videoWidth / video.videoHeight)
    }

    logPlayerEvent('info', 'direct_video_metadata_loaded', {
      duration: video.duration || 0,
      width: video.videoWidth,
      height: video.videoHeight,
    })

    setDuration(video.duration || 0)
    applyInitialProgress()
  }

  const frameStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = { aspectRatio: mediaAspectRatio }

    if (isShortLandscape && !isFullscreen) {
      style.width = 'min(100%, calc((100dvh - 10rem) * 16 / 9))'
    }

    return style
  }, [isFullscreen, isShortLandscape, mediaAspectRatio])

  const canToggleFullscreen = resolvedSource.mode !== 'invalid' && !hasPlaybackError

  return (
    <div className="space-y-3">
      <div
        ref={playerFrameRef}
        className={cn(
          'relative aspect-video w-full overflow-hidden bg-black transition-all duration-200',
          isFullscreen ? 'rounded-none' : 'rounded-lg',
          isShortLandscape && !isFullscreen && 'mx-auto',
        )}
        style={frameStyle}
      >
        {canToggleFullscreen && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={toggleFullscreen}
            className="absolute right-2 top-2 z-20 h-8 w-8 border border-white/20 bg-black/55 text-white hover:bg-black/70"
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        {resolvedSource.mode === 'direct_video' && !hasPlaybackError && (
          <video
            ref={videoRef}
            src={resolvedSource.playbackUrl}
            className="h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={handleVideoMetadataReady}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onError={(event) => {
              const mediaError = (event.currentTarget as HTMLVideoElement).error
              logPlayerEvent('error', 'direct_video_error', {
                code: mediaError?.code ?? null,
                message: mediaError?.message ?? null,
              })
              setHasPlaybackError(true)
            }}
          >
            Seu navegador não suporta reprodução de vídeo.
          </video>
        )}

        {!hasPlaybackError && resolvedSource.mode === 'vimeo' && (
          <iframe
            ref={vimeoIframeRef}
            src={resolvedSource.playbackUrl}
            title="Videoaula"
            className="block h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        )}

        {!hasPlaybackError && resolvedSource.mode === 'youtube' && (
          <div
            ref={youtubeContainerRef}
            className="h-full w-full [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
          />
        )}

        {(resolvedSource.mode === 'invalid' || hasPlaybackError) && (
          <PlaybackErrorOverlay externalUrl={resolvedSource.externalUrl} />
        )}
      </div>

      {resolvedSource.mode !== 'invalid' && duration > 0 && (
        <p className="text-xs text-muted-foreground">
          Progresso do vídeo: {formatTime(currentTime)} / {formatTime(duration)}
        </p>
      )}
    </div>
  )
}
