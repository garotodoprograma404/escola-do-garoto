/**
 * Helper functions para a feature de criação de curso
 */

interface Category {
  id: number
  name: string
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.trim().length > 0) {
    return normalizeBaseUrl(envUrl)
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return normalizeBaseUrl(window.location.origin)
  }

  return ''
}

/**
 * Busca o nome de uma categoria pelo ID
 * @param categoryId - ID da categoria (pode ser string ou number)
 * @param categories - Array de categorias disponíveis
 * @returns Nome da categoria ou 'Categoria não encontrada'
 */
export function getCategoryName(categoryId: string | number, categories: Category[]): string {
  const id = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId
  const category = categories.find((cat) => cat.id === id)
  return category?.name || 'Categoria não encontrada'
}

/**
 * Formata o nível do curso para exibição
 * @param level - Nível do curso (beginner, intermediate, advanced)
 * @returns Nível formatado em português
 */
export function formatCourseLevel(level: 'beginner' | 'intermediate' | 'advanced'): string {
  const levels = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }
  return levels[level] || level
}

/**
 * Formata preço para exibição em Real brasileiro
 * @param price - Preço em número
 * @returns Preço formatado (ex: R$ 197,00)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price)
}

/**
 * Calcula a economia entre preço original e preço com desconto
 * @param originalPrice - Preço original
 * @param discountPrice - Preço com desconto
 * @returns Objeto com economia em reais e porcentagem
 */
export function calculateSavings(
  originalPrice: number,
  discountPrice: number,
): { amount: number; percentage: number } {
  if (discountPrice >= originalPrice || originalPrice === 0) {
    return { amount: 0, percentage: 0 }
  }

  const amount = originalPrice - discountPrice
  const percentage = Math.round((amount / originalPrice) * 100)

  return { amount, percentage }
}

/**
 * Calcula a duração total de um array de aulas
 * @param lessons - Array de aulas com duration_minutes
 * @returns Objeto com horas e minutos
 */
export function calculateTotalDuration(lessons: Array<{ duration_minutes: number }>): {
  hours: number
  minutes: number
  total: number
} {
  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return { hours, minutes, total: totalMinutes }
}

/**
 * Formata duração em minutos para string legível
 * @param minutes - Duração em minutos
 * @returns String formatada (ex: "2h 30min" ou "45min")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}min`
}

/**
 * Extrai o ID do vídeo do YouTube de uma URL
 * @param url - URL do YouTube
 * @returns ID do vídeo ou null se inválido
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Detecta o tipo de plataforma de vídeo pela URL
 * @param url - URL do vídeo
 * @returns Tipo da plataforma (youtube, vimeo, other)
 */
export function detectVideoProvider(url: string): 'youtube' | 'vimeo' | 'other' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube'
  }
  if (url.includes('vimeo.com')) {
    return 'vimeo'
  }
  return 'other'
}

/**
 * Trunca texto longo e adiciona reticências
 * @param text - Texto a ser truncado
 * @param maxLength - Comprimento máximo
 * @returns Texto truncado
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Gera URL completa do curso baseado no slug
 * @param slug - Slug do curso
 * @returns URL completa
 */
export function generateCourseUrl(slug: string): string {
  const baseUrl = getAppBaseUrl()
  if (!baseUrl) {
    return `/courses/${slug}`
  }

  return `${baseUrl}/courses/${slug}`
}

export function getCourseUrlPrefix(): string {
  const baseUrl = getAppBaseUrl()
  if (!baseUrl) {
    return '/courses/'
  }

  return `${baseUrl}/courses/`
}

/** Slug da URL a partir do título: minúsculas, sem acento, só letras, números e hífens. */
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
