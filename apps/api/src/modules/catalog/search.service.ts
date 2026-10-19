import { Inject, Injectable } from '@nestjs/common'
import {
  and,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  blogPosts,
  categories,
  courses,
  profiles,
  searchHistory,
} from '../../database/schema/index.js'
import type { SearchQuery, SearchType } from './catalog.schemas.js'
import { containsPattern, ilikeEscaped, isPublicCourse, prefixPattern } from './catalog.helpers.js'

export type SearchResult = {
  id: string
  type: SearchType
  title: string
  description: string
  thumbnail_url: string | null
  url: string
  metadata: {
    price?: number
    rating?: number
    students_count?: number
    category?: string
    courses_count?: number
    author?: string
    published_at?: string
    category_blog?: string
  }
}

export type SearchStats = { total: number; courses: number; producers: number; blog_posts: number }

/** Quantos resultados de cada tipo a busca devolve. */
const RESULTS_PER_TYPE = 10
const MIN_QUERY_LENGTH = 2
/** Quantas buscas guardamos por pessoa; as mais antigas são apagadas ao salvar uma nova. */
const HISTORY_MAX_PER_USER = 100
const DESCRIPTION_CHARS = 300

@Injectable()
export class SearchService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async search(input: SearchQuery): Promise<SearchResult[]> {
    const term = input.q.trim()
    if (term.length < MIN_QUERY_LENGTH) return []

    const wants = (type: SearchType) => !input.type || input.type.includes(type)
    const [courseResults, producerResults, postResults] = await Promise.all([
      wants('course') ? this.searchCourses(term, input) : [],
      wants('producer') ? this.searchProducers(term) : [],
      wants('blog_post') ? this.searchPosts(term) : [],
    ])
    return [...courseResults, ...producerResults, ...postResults]
  }

  async getStats(rawTerm: string): Promise<SearchStats> {
    const term = rawTerm.trim()
    if (term.length < MIN_QUERY_LENGTH) return { total: 0, courses: 0, producers: 0, blog_posts: 0 }

    const [courseRows, producerRows, postRows] = await Promise.all([
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(courses)
        .where(this.courseMatch(term)),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(profiles)
        .where(this.producerMatch(term)),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(blogPosts)
        .where(this.postMatch(term)),
    ])
    const coursesTotal = courseRows[0]?.total ?? 0
    const producersTotal = producerRows[0]?.total ?? 0
    const postsTotal = postRows[0]?.total ?? 0
    return {
      total: coursesTotal + producersTotal + postsTotal,
      courses: coursesTotal,
      producers: producersTotal,
      blog_posts: postsTotal,
    }
  }

  /** Sugestões de digitação: títulos de cursos e nomes de instrutores que COMEÇAM com o termo. */
  async getSuggestions(rawTerm: string): Promise<string[]> {
    const term = rawTerm.trim()
    if (term.length < MIN_QUERY_LENGTH) return []
    const pattern = prefixPattern(term)

    const [courseRows, producerRows] = await Promise.all([
      this.db
        .select({ title: courses.title })
        .from(courses)
        .where(and(isPublicCourse, ilikeEscaped(courses.title, pattern)))
        .orderBy(courses.title)
        .limit(5),
      this.db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(
          and(
            this.publicProducer(),
            isNotNull(profiles.displayName),
            ilikeEscaped(profiles.displayName, pattern),
          ),
        )
        .orderBy(profiles.displayName)
        .limit(3),
    ])

    const suggestions = [
      ...courseRows.map((row) => row.title),
      ...producerRows.flatMap((row) => (row.displayName ? [row.displayName] : [])),
    ]
    return [...new Set(suggestions)].slice(0, 8)
  }

  /** Salva a busca da PESSOA LOGADA (o id vem da sessão, nunca do navegador). */
  async saveHistory(userId: string, query: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(searchHistory).values({ userId, query })
      // Mantém só as buscas mais recentes: sem isso o histórico de uma conta cresceria sem limite.
      const keep = tx
        .select({ id: searchHistory.id })
        .from(searchHistory)
        .where(eq(searchHistory.userId, userId))
        .orderBy(desc(searchHistory.createdAt), desc(searchHistory.id))
        .limit(HISTORY_MAX_PER_USER)
      await tx
        .delete(searchHistory)
        .where(and(eq(searchHistory.userId, userId), notInArray(searchHistory.id, keep)))
    })
  }

  /** Últimas buscas da PESSOA LOGADA, da mais recente para a mais antiga. */
  async getHistory(userId: string, limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ query: searchHistory.query })
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt), desc(searchHistory.id))
      .limit(limit)
    return rows.map((row) => row.query)
  }

  // ---------------------------------------------------------------------------------------------

  private courseMatch(term: string, filters?: SearchQuery): SQL {
    const pattern = containsPattern(term)
    const conditions: SQL[] = [
      isPublicCourse,
      or(ilikeEscaped(courses.title, pattern), ilikeEscaped(courses.description, pattern))!,
    ]
    if (filters?.category) conditions.push(eq(courses.categoryId, filters.category))
    if (filters?.minPrice !== undefined) conditions.push(gte(courses.price, filters.minPrice))
    if (filters?.maxPrice !== undefined) conditions.push(lte(courses.price, filters.maxPrice))
    if (filters?.rating) conditions.push(gte(courses.averageRating, filters.rating))
    return and(...conditions)!
  }

  /** Instrutor com perfil público ligado, ativo, com slug e ao menos um curso publicado. */
  private publicProducer(): SQL {
    return and(
      eq(profiles.isActive, true),
      eq(profiles.publicProfileEnabled, true),
      isNotNull(profiles.slug),
      exists(
        this.db
          .select({ one: courses.id })
          .from(courses)
          .where(and(eq(courses.producerId, profiles.id), isPublicCourse)),
      ),
    )!
  }

  private producerMatch(term: string): SQL {
    const pattern = containsPattern(term)
    return and(
      this.publicProducer(),
      or(ilikeEscaped(profiles.displayName, pattern), ilikeEscaped(profiles.bio, pattern))!,
    )!
  }

  /** Só post publicado e já no ar (`published_at <= now()`). */
  private postMatch(term: string): SQL {
    const pattern = containsPattern(term)
    return and(
      eq(blogPosts.status, 'published'),
      lte(blogPosts.publishedAt, sql`now()`),
      or(
        ilikeEscaped(blogPosts.title, pattern),
        ilikeEscaped(blogPosts.excerpt, pattern),
        ilikeEscaped(blogPosts.content, pattern),
      )!,
    )!
  }

  private async searchCourses(term: string, filters: SearchQuery): Promise<SearchResult[]> {
    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        description: sql<string>`left(${courses.description}, ${DESCRIPTION_CHARS})`,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        averageRating: courses.averageRating,
        totalStudents: courses.totalStudents,
        slug: courses.slug,
        categoryName: categories.name,
      })
      .from(courses)
      .innerJoin(categories, eq(categories.id, courses.categoryId))
      .where(this.courseMatch(term, filters))
      .orderBy(desc(courses.createdAt), desc(courses.id))
      .limit(RESULTS_PER_TYPE)

    return rows.map((row) => ({
      id: String(row.id),
      type: 'course',
      title: row.title,
      description: row.description ?? '',
      thumbnail_url: row.thumbnailUrl,
      url: `/courses/${row.slug}`,
      metadata: {
        price: row.price,
        rating: row.averageRating ?? 0,
        students_count: row.totalStudents,
        category: row.categoryName,
      },
    }))
  }

  private async searchProducers(term: string): Promise<SearchResult[]> {
    const rows = await this.db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        fullName: profiles.fullName,
        bio: sql<string | null>`left(${profiles.bio}, ${DESCRIPTION_CHARS})`,
        avatarUrl: profiles.avatarUrl,
        slug: profiles.slug,
      })
      .from(profiles)
      .where(this.producerMatch(term))
      .orderBy(profiles.displayName, profiles.id)
      .limit(RESULTS_PER_TYPE)
    const coursesCount = await this.countPublicCoursesByProducer(rows.map((row) => row.id))

    return rows.flatMap((row) =>
      row.slug
        ? [
            {
              id: row.id,
              type: 'producer' as const,
              title: row.displayName || 'Instrutor',
              description: row.bio ?? '',
              thumbnail_url: row.avatarUrl,
              url: `/instrutor/${row.slug}`,
              metadata: { courses_count: coursesCount.get(row.id) ?? 0 },
            },
          ]
        : [],
    )
  }

  /** Contagem só para os instrutores desta página de resultados. */
  private async countPublicCoursesByProducer(producerIds: string[]): Promise<Map<string, number>> {
    if (producerIds.length === 0) return new Map()
    const rows = await this.db
      .select({ producerId: courses.producerId, total: sql<number>`count(*)::int` })
      .from(courses)
      .where(and(isPublicCourse, inArray(courses.producerId, producerIds)))
      .groupBy(courses.producerId)
    return new Map(rows.map((row) => [row.producerId, row.total]))
  }

  private async searchPosts(term: string): Promise<SearchResult[]> {
    const rows = await this.db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        thumbnailUrl: blogPosts.featuredImageUrl,
        slug: blogPosts.slug,
        category: blogPosts.category,
        publishedAt: blogPosts.publishedAt,
        authorName: profiles.fullName,
      })
      .from(blogPosts)
      .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
      .where(this.postMatch(term))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
      .limit(RESULTS_PER_TYPE)

    return rows.map((row) => ({
      id: String(row.id),
      type: 'blog_post',
      title: row.title,
      description: row.excerpt ?? '',
      thumbnail_url: row.thumbnailUrl,
      url: `/blog/${row.slug}`,
      metadata: {
        author: row.authorName ?? undefined,
        published_at: row.publishedAt?.toISOString(),
        category_blog: row.category ?? undefined,
      },
    }))
  }
}
