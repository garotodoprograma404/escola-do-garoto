import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, desc, eq, exists, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { categories, courses, profiles } from '../../database/schema/index.js'
import {
  isPublicCourse,
  producerAverageRating,
  normalizeSocialLinks,
  resolveCurrentPrice,
  type SocialLinks,
} from './catalog.helpers.js'

type InstructorPublicCourse = {
  id: number
  title: string
  slug: string
  short_description: string | null
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  current_price: number
  average_rating: number | null
  total_students: number
  category_name: string
  updated_at: string
}

export type InstructorPublicProfile = {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  expertise_areas: string[]
  social_links: SocialLinks
  average_rating: number | null
  total_students: number
  total_courses: number
  courses: InstructorPublicCourse[]
}

/** Teto de cursos listados no perfil (um instrutor com mais que isso não cabe numa página). */
const INSTRUCTOR_COURSES_LIMIT = 100

@Injectable()
export class InstructorsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Perfil público do instrutor. Só existe para o
   * público se o perfil está ativo, com `public_profile_enabled` ligado e ao menos um curso
   * aprovado e publicado. Qualquer outro caso responde 404, sem distinguir o motivo.
   * Só campos públicos: nada de CPF, telefone, endereço, comissão ou faturamento.
   */
  async getPublicProfileBySlug(slug: string): Promise<InstructorPublicProfile> {
    const normalizedSlug = slug.trim()
    const [profile] = await this.db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        displayName: profiles.displayName,
        slug: profiles.slug,
        avatarUrl: profiles.avatarUrl,
        coverUrl: profiles.coverUrl,
        bio: profiles.bio,
        expertiseAreas: profiles.expertiseAreas,
        socialLinks: profiles.socialLinks,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.slug, normalizedSlug),
          eq(profiles.isActive, true),
          eq(profiles.publicProfileEnabled, true),
          exists(
            this.db
              .select({ one: courses.id })
              .from(courses)
              .where(and(eq(courses.producerId, profiles.id), isPublicCourse)),
          ),
        ),
      )
    if (!profile || !profile.slug) throw new NotFoundException('Instrutor não encontrado')

    // Números do instrutor calculados dos cursos públicos (o perfil não guarda contadores).
    const [statsRows, rows] = await Promise.all([
      this.db
        .select({
          totalStudents: sql<number>`coalesce(sum(${courses.totalStudents}), 0)::int`,
          totalCourses: sql<number>`count(*)::int`,
          averageRating: producerAverageRating,
        })
        .from(courses)
        .where(and(eq(courses.producerId, profile.id), isPublicCourse)),
      this.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          shortDescription: courses.shortDescription,
          thumbnailUrl: courses.thumbnailUrl,
          price: courses.price,
          discountPrice: courses.discountPrice,
          averageRating: courses.averageRating,
          totalStudents: courses.totalStudents,
          updatedAt: courses.updatedAt,
          categoryName: categories.name,
        })
        .from(courses)
        .innerJoin(categories, eq(categories.id, courses.categoryId))
        .where(and(eq(courses.producerId, profile.id), isPublicCourse))
        .orderBy(desc(courses.updatedAt), desc(courses.id))
        .limit(INSTRUCTOR_COURSES_LIMIT),
    ])
    const stats = statsRows[0]

    const mappedCourses: InstructorPublicCourse[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      short_description: row.shortDescription,
      thumbnail_url: row.thumbnailUrl,
      price: row.price,
      discount_price: row.discountPrice,
      current_price: resolveCurrentPrice(row.price, row.discountPrice),
      average_rating: row.averageRating,
      total_students: row.totalStudents,
      category_name: row.categoryName || 'Geral',
      updated_at: row.updatedAt.toISOString(),
    }))

    return {
      id: profile.id,
      name: profile.displayName?.trim() || profile.fullName,
      slug: profile.slug,
      avatar_url: profile.avatarUrl,
      cover_url: profile.coverUrl,
      bio: profile.bio,
      expertise_areas: profile.expertiseAreas ?? [],
      social_links: normalizeSocialLinks(profile.socialLinks),
      average_rating: stats?.averageRating ?? null,
      total_students: stats?.totalStudents ?? 0,
      total_courses: stats?.totalCourses ?? mappedCourses.length,
      courses: mappedCourses,
    }
  }
}
