import { parseVimeoVideo } from '@/shared/lib/vimeo'

type SupportedVideoSource = 'youtube' | 'vimeo' | 'direct_video'

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8|mpd)$/i

/** Caminho devolvido por `POST /api/files/upload` (a API revalida; aqui é só para o formulário). */
const UPLOAD_PATH_PATTERN = /^\/api\/files\/public\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+$/

export function isUploadedFilePath(value: string): boolean {
  return UPLOAD_PATH_PATTERN.test(value) && !value.includes('..')
}

function parseHttpUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  try {
    const parsedUrl = new URL(trimmed)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null
    }

    return parsedUrl
  } catch {
    return null
  }
}

function extractYouTubeId(url: string): string | null {
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

function resolveYouTubeStartSeconds(url: URL): number {
  return (
    parseTimeToken(url.searchParams.get('t')) ||
    parseTimeToken(url.searchParams.get('start')) ||
    parseTimeToken(url.searchParams.get('time_continue'))
  )
}

interface SupportedVideoUrl {
  source: SupportedVideoSource
  normalizedUrl: string
}

export function resolveSupportedVideoUrl(rawUrl: string): SupportedVideoUrl | null {
  const parsedUrl = parseHttpUrl(rawUrl)
  if (!parsedUrl) return null

  const youtubeId = extractYouTubeId(rawUrl)
  if (youtubeId) {
    const params = new URLSearchParams({
      v: youtubeId,
    })

    const startSeconds = resolveYouTubeStartSeconds(parsedUrl)
    if (startSeconds > 0) {
      params.set('t', `${startSeconds}s`)
    }

    return {
      source: 'youtube',
      normalizedUrl: `https://www.youtube.com/watch?${params.toString()}`,
    }
  }

  const vimeo = parseVimeoVideo(rawUrl)
  if (vimeo) {
    return {
      source: 'vimeo',
      normalizedUrl: vimeo.externalUrl,
    }
  }

  const pathname = parsedUrl.pathname.toLowerCase()
  if (DIRECT_VIDEO_PATTERN.test(pathname)) {
    return {
      source: 'direct_video',
      normalizedUrl: parsedUrl.toString(),
    }
  }

  return null
}

export function normalizeVideoLessonUrl(rawUrl: string): string | null {
  return resolveSupportedVideoUrl(rawUrl)?.normalizedUrl ?? null
}

export function isVideoLessonUrlSupported(rawUrl: string): boolean {
  return resolveSupportedVideoUrl(rawUrl) !== null
}

export function normalizeFileLessonUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (isUploadedFilePath(trimmed)) return trimmed

  const parsedUrl = parseHttpUrl(rawUrl)
  if (!parsedUrl) return null

  return parsedUrl.toString()
}
