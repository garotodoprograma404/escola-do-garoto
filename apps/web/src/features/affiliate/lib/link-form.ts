export function normalizeAffiliateOptionalText(value?: string): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeAffiliateDestinationPath(value?: string): string | null {
  const normalized = normalizeAffiliateOptionalText(value)
  if (!normalized) {
    return null
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}
