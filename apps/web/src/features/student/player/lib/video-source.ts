import { parseVimeoVideo } from '@/shared/lib/vimeo'

type ResolvedVideoMode = 'direct_video' | 'youtube' | 'vimeo' | 'invalid'

export interface ResolvedVideoSource {
  mode: ResolvedVideoMode
  playbackUrl: string
  externalUrl: string
  providerVideoId?: string
  startSeconds?: number
}

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8|mpd)(\?.*)?$/i

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#/]+)/,
    /youtube\.com\/embed\/([^&\n?#/]+)/,
    /youtube\.com\/shorts\/([^&\n?#/]+)/,
    /youtube-nocookie\.com\/embed\/([^&\n?#/]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

function parseTimeToken(rawValue: string | null): number {
  if (!rawValue) return 0
  const value = rawValue.trim().toLowerCase()
  if (!value) return 0

  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10)
  }

  const timeMatch = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!timeMatch) return 0

  const hours = Number.parseInt(timeMatch[1] ?? '0', 10)
  const minutes = Number.parseInt(timeMatch[2] ?? '0', 10)
  const seconds = Number.parseInt(timeMatch[3] ?? '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

function resolveYouTubeStartSeconds(url: string): number {
  try {
    const parsedUrl = new URL(url)

    return (
      parseTimeToken(parsedUrl.searchParams.get('t')) ||
      parseTimeToken(parsedUrl.searchParams.get('start')) ||
      parseTimeToken(parsedUrl.searchParams.get('time_continue'))
    )
  } catch {
    return 0
  }
}

export function resolveVideoSource(rawUrl: string): ResolvedVideoSource {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { mode: 'invalid', playbackUrl: '', externalUrl: '' }
  }

  const youtubeId = extractYouTubeId(trimmed)
  if (youtubeId) {
    const startSeconds = resolveYouTubeStartSeconds(trimmed)
    const params = new URLSearchParams({
      rel: '0',
      playsinline: '1',
    })

    if (startSeconds > 0) {
      params.set('start', String(startSeconds))
    }

    return {
      mode: 'youtube',
      playbackUrl: `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`,
      externalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
      providerVideoId: youtubeId,
      startSeconds: startSeconds > 0 ? startSeconds : undefined,
    }
  }

  const vimeoVideo = parseVimeoVideo(trimmed)
  if (vimeoVideo) {
    return {
      mode: 'vimeo',
      playbackUrl: vimeoVideo.embedUrl,
      externalUrl: vimeoVideo.externalUrl,
    }
  }

  if (DIRECT_VIDEO_PATTERN.test(trimmed)) {
    return {
      mode: 'direct_video',
      playbackUrl: trimmed,
      externalUrl: trimmed,
    }
  }

  try {
    const parsedUrl = new URL(trimmed)
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      // Non-video URLs must not be forced into HTML5 <video>, because this creates broken mini-canvas render.
      return {
        mode: 'invalid',
        playbackUrl: '',
        externalUrl: trimmed,
      }
    }
  } catch {
    return { mode: 'invalid', playbackUrl: '', externalUrl: '' }
  }

  return { mode: 'invalid', playbackUrl: '', externalUrl: '' }
}
