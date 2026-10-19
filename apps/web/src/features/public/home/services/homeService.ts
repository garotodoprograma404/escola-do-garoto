// =====================================================
// PUBLIC HOME - SERVICE
// =====================================================
// Os números da home vêm da API pública (GET /api/public/home/*). Como são dados iguais para
// todo visitante, ficam no cache do Next por alguns minutos (a chamada vai sem cookie de sessão).

import { unstable_cache } from 'next/cache'
import { publicApiGet } from '@/features/public/catalog/lib/public-api'
import type { FeaturedCourse } from '../types'

const DEFAULT_FEATURED_LIMIT = 8

type ErrorWithDigest = {
  message?: string
  digest?: string
}

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as ErrorWithDigest
  if (typeof typedError.digest === 'string' && typedError.digest.includes('DYNAMIC_SERVER_USAGE')) {
    return true
  }

  return (
    typeof typedError.message === 'string' && typedError.message.includes('DYNAMIC_SERVER_USAGE')
  )
}

/**
 * Roda a busca e devolve o valor padrão se a API falhar. O erro é tratado FORA do `unstable_cache`
 * (as funções em cache lançam), para o Next nunca guardar um resultado de falha por minutos.
 */
async function withFallback<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (!isDynamicServerUsageError(error)) {
      console.error(`Unexpected error fetching ${label}:`, error)
    }
    return fallback
  }
}

const getFeaturedCoursesCached = unstable_cache(
  () =>
    publicApiGet<FeaturedCourse[]>('/public/home/featured-courses', {
      limit: DEFAULT_FEATURED_LIMIT,
    }),
  ['home-featured-courses-v4'],
  {
    revalidate: 120,
    tags: ['home-public', 'home-courses'],
  },
)

/**
 * Busca cursos em destaque (os publicados mais recentes)
 */
export async function getFeaturedCourses(
  limit: number = DEFAULT_FEATURED_LIMIT,
): Promise<FeaturedCourse[]> {
  if (limit !== DEFAULT_FEATURED_LIMIT) {
    return withFallback(
      'featured courses',
      () => publicApiGet<FeaturedCourse[]>('/public/home/featured-courses', { limit }),
      [],
    )
  }

  return withFallback('featured courses', getFeaturedCoursesCached, [])
}
