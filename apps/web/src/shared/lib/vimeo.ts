export interface VimeoVideoInfo {
  id: string
  hash: string | null
  embedUrl: string
  externalUrl: string
}

function isPotentialVimeoHash(value: string): boolean {
  return /^(?=.*\d)[A-Za-z0-9]{6,}$/.test(value)
}

function findLastNumericSegment(segments: string[]): { id: string; index: number } | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (/^\d+$/.test(segment)) {
      return { id: segment, index }
    }
  }

  return null
}

function sanitizeHash(value: string | null): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  return /^[A-Za-z0-9]+$/.test(normalized) ? normalized : null
}

function isVimeoHostname(hostname: string): boolean {
  return hostname === 'vimeo.com' || hostname === 'www.vimeo.com' || hostname.endsWith('.vimeo.com')
}

export function parseVimeoVideo(url: string): VimeoVideoInfo | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (!isVimeoHostname(parsed.hostname)) {
      return null
    }

    const segments = parsed.pathname.split('/').filter(Boolean)
    const match = findLastNumericSegment(segments)
    if (!match) return null

    let hash = sanitizeHash(parsed.searchParams.get('h'))
    if (!hash) {
      const candidate = segments[match.index + 1]
      if (candidate && isPotentialVimeoHash(candidate)) {
        hash = candidate
      }
    }

    const embedUrl = hash
      ? `https://player.vimeo.com/video/${match.id}?h=${encodeURIComponent(hash)}`
      : `https://player.vimeo.com/video/${match.id}`

    return {
      id: match.id,
      hash,
      embedUrl,
      externalUrl: hash ? `https://vimeo.com/${match.id}/${hash}` : `https://vimeo.com/${match.id}`,
    }
  } catch {
    const fallback = trimmed.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:\/([A-Za-z0-9]{6,}))?/i)
    if (!fallback?.[1]) {
      return null
    }

    const hashFromQuery = trimmed.match(/[?&]h=([A-Za-z0-9]+)/i)?.[1] ?? null
    const hash = sanitizeHash(hashFromQuery) ?? sanitizeHash(fallback[2] ?? null)
    const id = fallback[1]

    return {
      id,
      hash,
      embedUrl: hash
        ? `https://player.vimeo.com/video/${id}?h=${encodeURIComponent(hash)}`
        : `https://player.vimeo.com/video/${id}`,
      externalUrl: hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`,
    }
  }
}

export function extractVimeoId(url: string): string | null {
  return parseVimeoVideo(url)?.id ?? null
}
