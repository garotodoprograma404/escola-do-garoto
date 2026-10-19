/** Gera o slug: minúsculas, sem acento, só letras/números/hífen. */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/** Slug sugerido quando o perfil público é ligado sem slug: nome + começo do id (evita colisão). */
export function buildDefaultSlug(
  displayName: string | null,
  fullName: string,
  userId: string,
): string {
  const base = slugify(displayName || fullName || 'instrutor')
  return `${base || 'instrutor'}-${userId.slice(0, 8)}`
}
