/**
 * URLs de conteúdo de aula, capa e imagens. A regra é aplicada no servidor
 * (o front pode ser burlado; o que vale é a regra aqui).
 *
 * Só aceitamos `http(s)` ou o caminho de um arquivo enviado pela nossa própria API
 * (`/api/files/public/...`). Nunca `javascript:`, `data:` etc.
 */

type SupportedVideoSource = 'youtube' | 'vimeo' | 'direct_video'

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|m3u8|mpd)$/i

/** Caminho devolvido por `POST /api/files/upload` (sem `..`, sem `//`, sem caracteres estranhos). */
const UPLOAD_PATH_PATTERN = /^\/api\/files\/public\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+$/

export function isUploadedFilePath(value: string): boolean {
  return UPLOAD_PATH_PATTERN.test(value) && !value.includes('..')
}

function parseHttpUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed
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
    if (match?.[1]) return match[1]
  }
  return null
}

function parseTimeToken(rawValue: string | null): number {
  if (!rawValue) return 0
  const value = rawValue.trim().toLowerCase()
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10)
  const timeMatch = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!timeMatch) return 0
  const hours = Number.parseInt(timeMatch[1] ?? '0', 10)
  const minutes = Number.parseInt(timeMatch[2] ?? '0', 10)
  const seconds = Number.parseInt(timeMatch[3] ?? '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

function isVimeoHostname(hostname: string): boolean {
  return hostname === 'vimeo.com' || hostname === 'www.vimeo.com' || hostname.endsWith('.vimeo.com')
}

/** Link do Vimeo → link canônico (`https://vimeo.com/<id>[/<hash>]`). */
function parseVimeoExternalUrl(url: URL): string | null {
  if (!isVimeoHostname(url.hostname)) return null
  const segments = url.pathname.split('/').filter(Boolean)
  let index = -1
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (/^\d+$/.test(segments[i] ?? '')) {
      index = i
      break
    }
  }
  if (index < 0) return null
  const id = segments[index]!

  const fromQuery = url.searchParams.get('h')?.trim() ?? ''
  const candidate = segments[index + 1]
  let hash: string | null = /^[A-Za-z0-9]+$/.test(fromQuery) ? fromQuery : null
  if (!hash && candidate && /^(?=.*\d)[A-Za-z0-9]{6,}$/.test(candidate)) hash = candidate
  return hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`
}

function resolveSupportedVideoUrl(
  rawUrl: string,
): { source: SupportedVideoSource; normalizedUrl: string } | null {
  const parsedUrl = parseHttpUrl(rawUrl)
  if (!parsedUrl) return null

  const youtubeId = extractYouTubeId(rawUrl)
  if (youtubeId) {
    const params = new URLSearchParams({ v: youtubeId })
    const startSeconds =
      parseTimeToken(parsedUrl.searchParams.get('t')) ||
      parseTimeToken(parsedUrl.searchParams.get('start')) ||
      parseTimeToken(parsedUrl.searchParams.get('time_continue'))
    if (startSeconds > 0) params.set('t', `${startSeconds}s`)
    return {
      source: 'youtube',
      normalizedUrl: `https://www.youtube.com/watch?${params.toString()}`,
    }
  }

  const vimeoUrl = parseVimeoExternalUrl(parsedUrl)
  if (vimeoUrl) return { source: 'vimeo', normalizedUrl: vimeoUrl }

  if (DIRECT_VIDEO_PATTERN.test(parsedUrl.pathname.toLowerCase())) {
    return { source: 'direct_video', normalizedUrl: parsedUrl.toString() }
  }
  return null
}

/** URL do vídeo da aula já no formato guardado no banco; `null` se não for suportada. */
export function normalizeVideoLessonUrl(rawUrl: string): string | null {
  return resolveSupportedVideoUrl(rawUrl)?.normalizedUrl ?? null
}

/** URL do arquivo da aula: link http(s) ou arquivo enviado pela nossa API. */
export function normalizeFileLessonUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (isUploadedFilePath(trimmed)) return trimmed
  return parseHttpUrl(trimmed)?.toString() ?? null
}

/** Imagem/capa/trailer: link http(s) ou arquivo enviado pela nossa API. Sem mudar a URL. */
export function isAllowedAssetUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim()
  return isUploadedFilePath(trimmed) || parseHttpUrl(trimmed) !== null
}

/**
 * Imagem de questão: o banco só aceita `https://` (check `quiz_questions_question_image_url_scheme_check`).
 * Arquivo enviado pela nossa API vira URL absoluta a partir da origem do site (`WEB_ORIGIN`).
 * Devolve `null` se não der para chegar a um `https://`.
 */
export function toHttpsImageUrl(rawUrl: string, webOrigin: string): string | null {
  const trimmed = rawUrl.trim()
  if (/^https:\/\//i.test(trimmed)) return parseHttpUrl(trimmed)?.toString() ?? null
  if (isUploadedFilePath(trimmed)) {
    const origin = webOrigin.replace(/\/+$/, '')
    return origin.startsWith('https://') ? `${origin}${trimmed}` : null
  }
  return null
}
