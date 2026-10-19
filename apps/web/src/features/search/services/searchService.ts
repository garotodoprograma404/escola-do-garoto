import { apiServer } from '@/lib/server-api'
import type { SearchResult, SearchFilters, SearchStats } from '../types'

const MIN_QUERY_LENGTH = 2

const EMPTY_STATS: SearchStats = { total: 0, courses: 0, producers: 0, blog_posts: 0 }

function isSearchable(query: string | undefined): query is string {
  return Boolean(query) && query!.trim().length >= MIN_QUERY_LENGTH
}

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// A busca (cursos aprovados e publicados, instrutores com perfil público, posts publicados) roda
// na API: GET /api/public/search*. O termo é escapado lá (LIKE) e nunca vira SQL.

export async function globalSearch(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  if (!isSearchable(query)) return []

  const result = await apiServer<SearchResult[]>('/public/search', {
    query: {
      q: query.trim(),
      type: filters?.type && filters.type.length > 0 ? filters.type.join(',') : undefined,
      category: filters?.category || undefined,
      minPrice: finiteNumber(filters?.minPrice),
      maxPrice: finiteNumber(filters?.maxPrice),
      rating: finiteNumber(filters?.rating),
    },
  })
  return result.ok ? result.data : []
}

export async function getSearchStats(query: string): Promise<SearchStats> {
  if (!isSearchable(query)) return EMPTY_STATS

  const result = await apiServer<SearchStats>('/public/search/stats', {
    query: { q: query.trim() },
  })
  return result.ok ? result.data : EMPTY_STATS
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!isSearchable(query)) return []

  const result = await apiServer<string[]>('/public/search/suggestions', {
    query: { q: query.trim() },
  })
  return result.ok ? result.data : []
}

/**
 * Salva a busca de quem está logado. O dono vem da sessão (cookie), por isso o `userId` recebido
 * é ignorado: ninguém grava histórico em nome de outra pessoa. Sem login, a API recusa (401) e
 * nada é salvo.
 */
export async function saveSearchHistory(_userId: string, query: string): Promise<void> {
  if (!isSearchable(query)) return
  await apiServer('/search/history', { method: 'POST', body: { query: query.trim() } })
}

/** Últimas buscas de quem está logado (o `userId` é ignorado: vale a sessão). */
export async function getSearchHistory(_userId: string, limit = 10): Promise<string[]> {
  const result = await apiServer<string[]>('/search/history', { query: { limit } })
  return result.ok ? result.data : []
}
