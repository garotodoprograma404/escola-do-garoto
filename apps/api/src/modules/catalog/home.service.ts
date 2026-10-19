import { Inject, Injectable } from '@nestjs/common'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { categories, courses } from '../../database/schema/index.js'
import { isPublicCourse, producerDisplayName, roundRating } from './catalog.helpers.js'
import { fetchProducers } from './producers.lookup.js'

export type HeroStats = {
  total_courses: number
  total_instructors: number
  average_rating: number
}

export type FeaturedCourse = {
  id: string
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  total_students: number
  category_name: string
  producer_name: string
  producer_avatar: string | null
}

export type CategoryWithCount = {
  id: string
  name: string
  slug: string
  icon: string | null
  course_count: number
}

/** Média mostrada quando ainda não há nenhuma nota. */
const DEFAULT_AVERAGE_RATING = 4.8
const FEATURED_DESCRIPTION_CHARS = 500

@Injectable()
export class HomeService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Contadores do hero da home. Uma agregação no banco, sem trazer os cursos para contar no JavaScript.
   */
  async getHeroStats(): Promise<HeroStats> {
    const [row] = await this.db
      .select({
        totalCourses: sql<number>`count(*)::int`,
        totalInstructors: sql<number>`count(distinct ${courses.producerId})::int`,
        averageRating: sql<number | null>`avg(${courses.averageRating})::float8`,
      })
      .from(courses)
      .where(isPublicCourse)

    return {
      total_courses: row?.totalCourses ?? 0,
      total_instructors: row?.totalInstructors ?? 0,
      average_rating:
        row?.averageRating === null || row?.averageRating === undefined
          ? DEFAULT_AVERAGE_RATING
          : roundRating(row.averageRating),
    }
  }

  /** Cursos em destaque na home: os publicados mais recentes. */
  async getFeaturedCourses(limit: number): Promise<FeaturedCourse[]> {
    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: sql<string>`left(${courses.description}, ${FEATURED_DESCRIPTION_CHARS})`,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        discountPrice: courses.discountPrice,
        averageRating: courses.averageRating,
        totalStudents: courses.totalStudents,
        producerId: courses.producerId,
        categoryName: categories.name,
      })
      .from(courses)
      .innerJoin(categories, eq(categories.id, courses.categoryId))
      .where(isPublicCourse)
      .orderBy(desc(courses.createdAt), desc(courses.id))
      .limit(limit)

    const producers = await fetchProducers(
      this.db,
      rows.map((row) => row.producerId),
    )

    return rows.map((row) => {
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
        total_students: row.totalStudents,
        category_name: row.categoryName || 'Geral',
        producer_name: producerDisplayName(producer, false),
        producer_avatar: producer?.avatarUrl ?? null,
      }
    })
  }

  /** Categorias de topo mais cheias de cursos publicados (as sem curso ficam de fora). */
  async getPopularCategories(limit: number): Promise<CategoryWithCount[]> {
    const roots = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
      })
      .from(categories)
      .where(and(isNull(categories.parentId), eq(categories.isActive, true)))
      .orderBy(asc(categories.name))
    if (roots.length === 0) return []

    const counts = await this.db
      .select({ categoryId: courses.categoryId, total: sql<number>`count(*)::int` })
      .from(courses)
      .where(
        and(
          isPublicCourse,
          inArray(
            courses.categoryId,
            roots.map((root) => root.id),
          ),
        ),
      )
      .groupBy(courses.categoryId)
    const countByCategory = new Map(counts.map((row) => [row.categoryId, row.total]))

    return roots
      .map((root) => ({
        id: String(root.id),
        name: root.name,
        slug: root.slug,
        icon: root.icon,
        course_count: countByCategory.get(root.id) ?? 0,
      }))
      .filter((category) => category.course_count > 0)
      .sort((a, b) => b.course_count - a.course_count || a.name.localeCompare(b.name))
      .slice(0, limit)
  }
}
