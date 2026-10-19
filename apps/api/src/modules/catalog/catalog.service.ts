import { Inject, Injectable } from '@nestjs/common'
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { categories, courseLessons, courseModules, courses } from '../../database/schema/index.js'
import type { CatalogQuery } from './catalog.schemas.js'
import {
  containsPattern,
  ilikeEscaped,
  isPublicCourse,
  minutesToHours,
  producerDisplayName,
  resolveCurrentPrice,
} from './catalog.helpers.js'
import { fetchProducers } from './producers.lookup.js'

type CatalogCourse = {
  id: string
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  level: string
  total_students: number
  total_lessons: number
  duration_hours: number
  category_name: string
  category_slug: string
  producer_name: string
  producer_avatar: string | null
  created_at: string
}

export type CatalogResult = {
  courses: CatalogCourse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CategoryOption = { id: string; name: string; slug: string; course_count: number }

export type CartCourse = {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  /** Preço que vale hoje (promoção, se houver), em reais. É este que o carrinho mostra. */
  price: number
  list_price: number
  discount_price: number | null
  producer_name: string
  coupons_enabled: boolean
}

/** Cartão de curso mostra no máximo isto da descrição (o resto só no detalhe do curso). */
const CARD_DESCRIPTION_CHARS = 500

@Injectable()
export class CatalogService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Listagem do catálogo: só cursos aprovados e publicados, com filtros, ordenação e paginação.
   * O custo é proporcional à PÁGINA: a consulta principal traz `limit` linhas e as contagens de
   * aulas e os produtores são buscados só para os cursos dessa página.
   */
  async listCourses(query: CatalogQuery): Promise<CatalogResult> {
    const where = await this.buildFilters(query)

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          description: sql<string>`left(${courses.description}, ${CARD_DESCRIPTION_CHARS})`,
          thumbnailUrl: courses.thumbnailUrl,
          price: courses.price,
          discountPrice: courses.discountPrice,
          averageRating: courses.averageRating,
          level: courses.level,
          totalDurationMinutes: courses.totalDurationMinutes,
          totalStudents: courses.totalStudents,
          producerId: courses.producerId,
          createdAt: courses.createdAt,
          categoryName: categories.name,
          categorySlug: categories.slug,
        })
        .from(courses)
        .innerJoin(categories, eq(categories.id, courses.categoryId))
        .where(where)
        .orderBy(...this.orderBy(query.sortBy))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(courses)
        .where(where),
    ])

    const courseIds = rows.map((row) => row.id)
    const [lessonCounts, producers] = await Promise.all([
      this.countLessons(courseIds),
      fetchProducers(
        this.db,
        rows.map((row) => row.producerId),
      ),
    ])

    const total = totalRow?.total ?? 0
    return {
      courses: rows.map((row) => {
        const producer = producers.get(row.producerId)
        return {
          id: String(row.id),
          title: row.title,
          slug: row.slug,
          description: row.description ?? '',
          thumbnail_url: row.thumbnailUrl,
          price: row.price,
          discount_price: row.discountPrice,
          rating: row.averageRating ?? 0,
          level: row.level,
          total_students: row.totalStudents,
          total_lessons: lessonCounts.get(row.id) ?? 0,
          duration_hours: minutesToHours(row.totalDurationMinutes),
          category_name: row.categoryName || 'Geral',
          category_slug: row.categorySlug || 'geral',
          producer_name: producerDisplayName(producer, false),
          producer_avatar: producer?.avatarUrl ?? null,
          created_at: row.createdAt.toISOString(),
        }
      }),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    }
  }

  /** Categorias de topo, ativas, com a contagem de cursos publicados. Só as que têm curso. */
  async listCategoryOptions(): Promise<CategoryOption[]> {
    const [roots, counts] = await Promise.all([
      this.db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories)
        .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
        .orderBy(asc(categories.name)),
      this.countPublicCoursesByCategory(),
    ])

    return roots
      .map((category) => ({
        id: String(category.id),
        name: category.name,
        slug: category.slug,
        course_count: counts.get(category.id) ?? 0,
      }))
      .filter((category) => category.course_count > 0)
  }

  /**
   * Dados ATUAIS dos cursos que estão no carrinho. O carrinho fica num cookie que o próprio
   * visitante controla (preço, título...): o que vale para exibir é o que está no banco. Cursos
   * que saíram do ar simplesmente não voltam. Mantém a ordem dos ids recebidos.
   */
  async getCartCourses(ids: number[]): Promise<CartCourse[]> {
    if (ids.length === 0) return []

    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        discountPrice: courses.discountPrice,
        couponsEnabled: courses.couponsEnabled,
        producerId: courses.producerId,
      })
      .from(courses)
      .where(and(isPublicCourse, inArray(courses.id, ids)))

    const producers = await fetchProducers(
      this.db,
      rows.map((row) => row.producerId),
    )
    const byId = new Map(rows.map((row) => [row.id, row]))

    return ids.flatMap((id) => {
      const row = byId.get(id)
      if (!row) return []
      return [
        {
          id: String(row.id),
          title: row.title,
          slug: row.slug,
          thumbnail_url: row.thumbnailUrl,
          price: resolveCurrentPrice(row.price, row.discountPrice),
          list_price: row.price,
          discount_price: row.discountPrice,
          producer_name: producerDisplayName(producers.get(row.producerId), true),
          coupons_enabled: row.couponsEnabled ?? true,
        },
      ]
    })
  }

  private async countPublicCoursesByCategory(): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ categoryId: courses.categoryId, total: sql<number>`count(*)::int` })
      .from(courses)
      .where(isPublicCourse)
      .groupBy(courses.categoryId)
    return new Map(rows.map((row) => [row.categoryId, row.total]))
  }

  private async countLessons(courseIds: number[]): Promise<Map<number, number>> {
    if (courseIds.length === 0) return new Map()
    const rows = await this.db
      .select({ courseId: courseModules.courseId, total: sql<number>`count(*)::int` })
      .from(courseLessons)
      .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
      .where(inArray(courseModules.courseId, courseIds))
      .groupBy(courseModules.courseId)
    return new Map(rows.map((row) => [row.courseId, row.total]))
  }

  private async buildFilters(query: CatalogQuery): Promise<SQL> {
    const conditions: SQL[] = [isPublicCourse]

    if (query.search) {
      const pattern = containsPattern(query.search)
      conditions.push(
        or(ilikeEscaped(courses.title, pattern), ilikeEscaped(courses.description, pattern))!,
      )
    }

    if (query.category) {
      // Categoria que não existe não filtra nada.
      const [category] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, query.category))
      if (category) conditions.push(eq(courses.categoryId, category.id))
    }

    if (query.minPrice !== undefined) conditions.push(gte(courses.price, query.minPrice))
    if (query.maxPrice !== undefined) conditions.push(lte(courses.price, query.maxPrice))
    if (query.rating) conditions.push(gte(courses.averageRating, query.rating))
    if (query.level) conditions.push(eq(courses.level, query.level))

    return and(...conditions)!
  }

  /** Sempre termina em `id`: sem desempate a paginação repete/perde cursos entre páginas. */
  private orderBy(sortBy: CatalogQuery['sortBy']): SQL[] {
    const newest = desc(courses.createdAt)
    const tiebreak = desc(courses.id)
    switch (sortBy) {
      case 'price_low':
        return [asc(courses.price), newest, tiebreak]
      case 'price_high':
        return [desc(courses.price), newest, tiebreak]
      case 'rating':
        // Sem nota vai para o fim (o PostgreSQL, por padrão, põe `null` primeiro no `desc`).
        return [sql`${courses.averageRating} desc nulls last`, newest, tiebreak]
      // "Popular" é um apelido de "mais novos" (ainda não há métrica de popularidade).
      case 'popular':
      case 'newest':
        return [newest, tiebreak]
    }
  }
}
