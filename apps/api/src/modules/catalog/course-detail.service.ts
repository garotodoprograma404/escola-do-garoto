import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  categories,
  courseLessons,
  courseModules,
  courseReviews,
  courses,
  enrollments,
  profiles,
} from '../../database/schema/index.js'
import {
  isPublicCourse,
  producerAverageRating,
  normalizeStringList,
  producerDisplayName,
  publicLessonContent,
  roundRating,
} from './catalog.helpers.js'
import { fetchProducers } from './producers.lookup.js'

type CourseLessonPublic = {
  id: number
  title: string
  description: string | null
  type: 'video' | 'text' | 'quiz' | 'file'
  /** Só vem preenchido em PRÉVIA GRÁTIS; nas demais aulas é sempre `null`. */
  content_url: string | null
  /** Só vem preenchido em PRÉVIA GRÁTIS; nas demais aulas é sempre `null`. */
  content_text: string | null
  duration_minutes: number | null
  is_free_preview: boolean
  is_published: boolean
  display_order: number
}

type CourseModulePublic = {
  id: number
  title: string
  description: string | null
  display_order: number
  is_published: boolean
  lessons: CourseLessonPublic[]
}

export type CourseDetailPublic = {
  id: number
  title: string
  slug: string
  description: string
  short_description: string | null
  thumbnail_url: string | null
  cover_image_url: string | null
  trailer_url: string | null
  price: number
  discount_price: number | null
  average_rating: number | null
  level: string
  total_duration_minutes: number
  total_lessons: number
  total_students: number
  total_reviews: number
  has_lifetime_access: boolean
  has_certificate: boolean
  status: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  category: { id: number; name: string; slug: string }
  producer: {
    id: string
    name: string
    slug: string | null
    public_profile_enabled: boolean
    avatar: string | null
    bio: string | null
    expertise_areas: string[]
    average_rating: number | null
    total_students: number
    total_courses: number
  }
  modules: CourseModulePublic[]
  stats: {
    total_students: number
    total_lessons: number
    total_reviews: number
    completion_rate: number
  }
  what_you_will_learn: string[]
  requirements: string[]
  target_audience: string[]
}

export type CourseReviewPublic = {
  id: string
  rating: number
  title: string | null
  review: string | null
  created_at: string
  user: { name: string; avatar: string | null }
  response: string | null
  responded_at: string | null
  responded_by: string | null
  is_verified_purchase: boolean
  is_featured: boolean
  helpful_count: number
}

export type ReviewStatsPublic = {
  average_rating: number
  total_reviews: number
  rating_distribution: { rating: number; count: number; percentage: number }[]
}

export type RelatedCoursePublic = {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  rating: number
  total_students: number
  category_name: string
  producer_name: string
}

@Injectable()
export class CourseDetailService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Detalhe público do curso (aprovado + publicado) com currículo e instrutor.
   * O currículo mostra só a ESTRUTURA (títulos, tipo, duração). O conteúdo da aula (`content_url`,
   * `content_text`) só vai nas prévias grátis; gabarito de quiz nunca sai daqui (nem é consultado).
   */
  async getCourseBySlug(slug: string): Promise<CourseDetailPublic> {
    const [course] = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        shortDescription: courses.shortDescription,
        thumbnailUrl: courses.thumbnailUrl,
        coverImageUrl: courses.coverImageUrl,
        trailerUrl: courses.trailerUrl,
        price: courses.price,
        discountPrice: courses.discountPrice,
        averageRating: courses.averageRating,
        level: courses.level,
        totalDurationMinutes: courses.totalDurationMinutes,
        totalLessons: courses.totalLessons,
        totalStudents: courses.totalStudents,
        totalReviews: courses.totalReviews,
        hasLifetimeAccess: courses.hasLifetimeAccess,
        hasCertificate: courses.hasCertificate,
        status: courses.status,
        isPublished: courses.isPublished,
        publishedAt: courses.publishedAt,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        whatYouWillLearn: courses.whatYouWillLearn,
        requirements: courses.requirements,
        targetAudience: courses.targetAudience,
        producerId: courses.producerId,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(courses)
      .innerJoin(categories, eq(categories.id, courses.categoryId))
      .where(and(eq(courses.slug, slug), isPublicCourse))
    if (!course) throw new NotFoundException('Curso não encontrado')

    const [producerRows, producerStats, modules, lessons] = await Promise.all([
      // Mesma regra de `get_public_instructor_profiles`: perfil ativo de quem tem curso publicado.
      this.db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          displayName: profiles.displayName,
          slug: profiles.slug,
          avatarUrl: profiles.avatarUrl,
          bio: profiles.bio,
          expertiseAreas: profiles.expertiseAreas,
          publicProfileEnabled: profiles.publicProfileEnabled,
        })
        .from(profiles)
        .where(and(eq(profiles.id, course.producerId), eq(profiles.isActive, true))),
      this.db
        .select({
          totalStudents: sql<number>`coalesce(sum(${courses.totalStudents}), 0)::int`,
          totalCourses: sql<number>`count(*)::int`,
          averageRating: producerAverageRating,
        })
        .from(courses)
        .where(and(eq(courses.producerId, course.producerId), isPublicCourse)),
      this.db
        .select({
          id: courseModules.id,
          title: courseModules.title,
          description: courseModules.description,
          displayOrder: courseModules.displayOrder,
          isPublished: courseModules.isPublished,
        })
        .from(courseModules)
        .where(and(eq(courseModules.courseId, course.id), eq(courseModules.isPublished, true)))
        .orderBy(asc(courseModules.displayOrder), asc(courseModules.id)),
      this.db
        .select({
          id: courseLessons.id,
          moduleId: courseLessons.moduleId,
          title: courseLessons.title,
          description: courseLessons.description,
          type: courseLessons.type,
          contentUrl: courseLessons.contentUrl,
          contentText: courseLessons.contentText,
          durationMinutes: courseLessons.durationMinutes,
          isFreePreview: courseLessons.isFreePreview,
          isPublished: courseLessons.isPublished,
          displayOrder: courseLessons.displayOrder,
        })
        .from(courseLessons)
        .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
        .where(
          and(
            eq(courseModules.courseId, course.id),
            eq(courseModules.isPublished, true),
            eq(courseLessons.isPublished, true),
          ),
        )
        .orderBy(asc(courseLessons.displayOrder), asc(courseLessons.id)),
    ])

    const producer = producerRows[0]
    const normalizedModules: CourseModulePublic[] = modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      display_order: module.displayOrder,
      is_published: module.isPublished,
      lessons: lessons
        .filter((lesson) => lesson.moduleId === module.id)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          ...publicLessonContent(lesson),
          duration_minutes: lesson.durationMinutes,
          is_free_preview: lesson.isFreePreview,
          is_published: lesson.isPublished,
          display_order: lesson.displayOrder,
        })),
    }))

    const lessonsFromModules = normalizedModules.reduce((sum, mod) => sum + mod.lessons.length, 0)
    const durationFromLessons = lessons.reduce(
      (sum, lesson) => sum + (lesson.durationMinutes ?? 0),
      0,
    )
    const totalLessons = course.totalLessons > 0 ? course.totalLessons : lessonsFromModules
    const totalDuration =
      course.totalDurationMinutes > 0 ? course.totalDurationMinutes : durationFromLessons

    // Os contadores do curso podem estar zerados (ainda não recalculados): cai para a contagem real.
    const [studentsFallback, reviewsFallback] = await Promise.all([
      course.totalStudents > 0 ? course.totalStudents : this.countEnrollments(course.id),
      course.totalReviews > 0 ? course.totalReviews : this.countReviews(course.id),
    ])

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description || '',
      short_description: course.shortDescription,
      thumbnail_url: course.thumbnailUrl,
      cover_image_url: course.coverImageUrl,
      trailer_url: course.trailerUrl,
      price: course.price,
      discount_price: course.discountPrice,
      average_rating: course.averageRating,
      level: course.level,
      total_duration_minutes: totalDuration,
      total_lessons: totalLessons,
      total_students: studentsFallback,
      total_reviews: reviewsFallback,
      has_lifetime_access: course.hasLifetimeAccess,
      has_certificate: course.hasCertificate,
      status: course.status,
      is_published: course.isPublished,
      published_at: course.publishedAt?.toISOString() ?? null,
      created_at: course.createdAt.toISOString(),
      updated_at: course.updatedAt.toISOString(),
      category: { id: course.categoryId, name: course.categoryName, slug: course.categorySlug },
      producer: {
        id: producer?.id ?? course.producerId,
        name: producerDisplayName(producer, true),
        // Só entrega o slug se o perfil público estiver ligado (senão o link levaria a um 404).
        slug: producer?.publicProfileEnabled ? (producer.slug ?? null) : null,
        public_profile_enabled: producer?.publicProfileEnabled ?? false,
        avatar: producer?.avatarUrl ?? null,
        bio: producer?.bio ?? null,
        expertise_areas: producer?.expertiseAreas ?? [],
        average_rating: producerStats[0]?.averageRating ?? null,
        total_students: producerStats[0]?.totalStudents ?? 0,
        total_courses: producerStats[0]?.totalCourses ?? 0,
      },
      modules: normalizedModules,
      stats: {
        total_students: studentsFallback,
        total_lessons: totalLessons,
        total_reviews: reviewsFallback,
        completion_rate: 0,
      },
      what_you_will_learn: normalizeStringList(course.whatYouWillLearn),
      requirements: normalizeStringList(course.requirements),
      target_audience: normalizeStringList(course.targetAudience),
    }
  }

  /** Avaliações mais recentes de um curso público (com nome e avatar de quem avaliou). */
  async getReviews(courseId: number, limit: number): Promise<CourseReviewPublic[]> {
    await this.assertPublicCourse(courseId)

    const rows = await this.db
      .select({
        id: courseReviews.id,
        rating: courseReviews.rating,
        title: courseReviews.title,
        review: courseReviews.review,
        createdAt: courseReviews.createdAt,
        response: courseReviews.response,
        respondedAt: courseReviews.respondedAt,
        respondedBy: courseReviews.respondedBy,
        isVerifiedPurchase: courseReviews.isVerifiedPurchase,
        isFeatured: courseReviews.isFeatured,
        helpfulCount: courseReviews.helpfulCount,
        authorName: profiles.fullName,
        authorAvatar: profiles.avatarUrl,
      })
      .from(courseReviews)
      .leftJoin(profiles, eq(profiles.id, courseReviews.userId))
      .where(eq(courseReviews.courseId, courseId))
      .orderBy(desc(courseReviews.createdAt), desc(courseReviews.id))
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title,
      review: row.review,
      created_at: row.createdAt?.toISOString() ?? '',
      user: { name: row.authorName || 'Aluno', avatar: row.authorAvatar ?? null },
      response: row.response,
      responded_at: row.respondedAt?.toISOString() ?? null,
      responded_by: row.respondedBy,
      is_verified_purchase: row.isVerifiedPurchase ?? true,
      is_featured: row.isFeatured ?? false,
      helpful_count: row.helpfulCount ?? 0,
    }))
  }

  /**
   * Média e distribuição de notas (5 a 1). Numa consulta só, sem trazer as linhas.
   */
  async getReviewStats(courseId: number): Promise<ReviewStatsPublic> {
    await this.assertPublicCourse(courseId)

    const rows = await this.db
      .select({ rating: courseReviews.rating, total: sql<number>`count(*)::int` })
      .from(courseReviews)
      .where(eq(courseReviews.courseId, courseId))
      .groupBy(courseReviews.rating)

    const countByRating = new Map(rows.map((row) => [row.rating, row.total]))
    const totalReviews = rows.reduce((sum, row) => sum + row.total, 0)
    const ratingSum = rows.reduce((sum, row) => sum + row.rating * row.total, 0)

    return {
      average_rating: totalReviews === 0 ? 0 : roundRating(ratingSum / totalReviews),
      total_reviews: totalReviews,
      rating_distribution: [5, 4, 3, 2, 1].map((rating) => {
        const count = countByRating.get(rating) ?? 0
        return {
          rating,
          count,
          percentage: totalReviews === 0 ? 0 : Math.round((count / totalReviews) * 100),
        }
      }),
    }
  }

  /**
   * Cursos relacionados: mesma categoria do curso, publicados, exceto ele mesmo.
   * A categoria vem do banco (e não do que o navegador mandar).
   */
  async getRelatedCourses(courseId: number, limit: number): Promise<RelatedCoursePublic[]> {
    const current = await this.assertPublicCourse(courseId)

    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
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
      .where(
        and(isPublicCourse, eq(courses.categoryId, current.categoryId), ne(courses.id, courseId)),
      )
      .orderBy(desc(courses.createdAt), desc(courses.id))
      .limit(limit)

    const producers = await fetchProducers(
      this.db,
      rows.map((row) => row.producerId),
    )

    return rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      slug: row.slug,
      thumbnail_url: row.thumbnailUrl,
      price: row.price,
      discount_price: row.discountPrice,
      rating: row.averageRating ?? 0,
      total_students: row.totalStudents,
      category_name: row.categoryName || 'Geral',
      producer_name: producerDisplayName(producers.get(row.producerId), true),
    }))
  }

  /** Curso que não é público (rascunho, em análise, despublicado) responde igual a "não existe". */
  private async assertPublicCourse(courseId: number): Promise<{ id: number; categoryId: number }> {
    const [course] = await this.db
      .select({ id: courses.id, categoryId: courses.categoryId })
      .from(courses)
      .where(and(eq(courses.id, courseId), isPublicCourse))
    if (!course) throw new NotFoundException('Curso não encontrado')
    return course
  }

  private async countEnrollments(courseId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
    return row?.total ?? 0
  }

  private async countReviews(courseId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(courseReviews)
      .where(eq(courseReviews.courseId, courseId))
    return row?.total ?? 0
  }
}
