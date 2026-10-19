import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  categories,
  courseAudits,
  courseLessons,
  courseModules,
  courses,
  enrollments,
  profiles,
  transactions,
  userRoles,
  users,
} from '../../database/schema/index.js'
import { loadCourseForEdit } from '../producer-courses/course-graph.js'
import { toCents } from '../producer-courses/course-input.schemas.js'
import { sanitizeLessonHtml } from '../learning/lesson-html.js'
import { escapeLike } from '../producer-courses/producer-courses.service.js'
import type { AdminCoursesQuery, RoleUsersQuery } from './admin-courses.schemas.js'

type SalesTotals = { count: number; revenueCents: number }

/** Leituras do painel admin de cursos. Toda rota que chega aqui já exige `@Roles(['admin'])`. */
@Injectable()
export class AdminCoursesQueriesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  categories() {
    return this.db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name))
  }

  private async salesByCourse(courseIds: number[]): Promise<Map<number, SalesTotals>> {
    const result = new Map<number, SalesTotals>()
    if (courseIds.length === 0) return result
    const rows = await this.db
      .select({
        courseId: transactions.courseId,
        total: count(),
        amount: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.courseId, courseIds),
          eq(transactions.type, 'sale'),
          eq(transactions.status, 'completed'),
        ),
      )
      .groupBy(transactions.courseId)
    for (const row of rows) {
      if (row.courseId !== null) {
        result.set(row.courseId, { count: row.total, revenueCents: toCents(Number(row.amount)) })
      }
    }
    return result
  }

  async listCourses(query: AdminCoursesQuery) {
    const filters: SQL[] = []
    if (query.status !== 'ALL') {
      filters.push(eq(courses.status, query.status === 'pending' ? 'pending_review' : query.status))
    }
    if (query.producerId) filters.push(eq(courses.producerId, query.producerId))
    if (query.searchTerm) filters.push(ilike(courses.title, `%${escapeLike(query.searchTerm)}%`))
    if (query.category !== 'ALL') {
      filters.push(
        inArray(
          courses.categoryId,
          this.db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.name, query.category)),
        ),
      )
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const [{ total }] = await this.db.select({ total: count() }).from(courses).where(where)
    const totalPages = Math.ceil(total / query.pageSize)

    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        producerId: courses.producerId,
        producerName: sql<string | null>`coalesce(${profiles.displayName}, ${profiles.fullName})`,
        category: categories.name,
        price: courses.price,
        status: courses.status,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        rating: courses.averageRating,
      })
      .from(courses)
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .where(where)
      .orderBy(desc(courses.createdAt), desc(courses.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize)

    const sales = await this.salesByCourse(rows.map((row) => row.id))
    return {
      courses: rows.map((row) => this.toListItem(row, sales.get(row.id))),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
    }
  }

  private toListItem(
    row: {
      id: number
      title: string
      producerId: string
      producerName: string | null
      category: string | null
      price: number
      status: string
      createdAt: Date
      updatedAt: Date
      rating: number | null
    },
    sales: SalesTotals | undefined,
  ) {
    return {
      id: String(row.id),
      title: row.title,
      producerId: row.producerId,
      producerName: row.producerName || 'Produtor Desconhecido',
      category: row.category || 'Sem Categoria',
      price: row.price,
      status: row.status === 'pending_review' ? 'pending' : row.status,
      submittedAt: row.createdAt,
      updatedAt: row.updatedAt,
      salesCount: sales?.count ?? 0,
      revenue: (sales?.revenueCents ?? 0) / 100,
      rating: row.rating ?? 0,
    }
  }

  async statusCounts() {
    const rows = await this.db
      .select({ status: courses.status, total: count() })
      .from(courses)
      .groupBy(courses.status)
    const counts = { draft: 0, pending: 0, approved: 0, rejected: 0, archived: 0 }
    for (const row of rows) {
      if (row.status === 'draft') counts.draft = row.total
      else if (row.status === 'pending_review') counts.pending = row.total
      else if (row.status === 'approved') counts.approved = row.total
      else if (row.status === 'rejected') counts.rejected = row.total
      else if (row.status === 'archived') counts.archived = row.total
    }
    return counts
  }

  async getCourse(courseId: number) {
    const result = await this.listOne(courseId)
    if (!result) throw new NotFoundException('Curso não encontrado')
    return result
  }

  private async listOne(courseId: number) {
    const [row] = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        producerId: courses.producerId,
        producerName: sql<string | null>`coalesce(${profiles.displayName}, ${profiles.fullName})`,
        category: categories.name,
        price: courses.price,
        status: courses.status,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        rating: courses.averageRating,
      })
      .from(courses)
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .where(eq(courses.id, courseId))
    if (!row) return null
    const sales = await this.salesByCourse([courseId])
    return this.toListItem(row, sales.get(courseId))
  }

  async getDetails(courseId: number) {
    const [course] = await this.db
      .select({
        id: courses.id,
        producerId: courses.producerId,
        title: courses.title,
        slug: courses.slug,
        categoryId: courses.categoryId,
        categoryName: categories.name,
        level: courses.level,
        shortDescription: courses.shortDescription,
        description: courses.description,
        thumbnailUrl: courses.thumbnailUrl,
        coverImageUrl: courses.coverImageUrl,
        trailerUrl: courses.trailerUrl,
        isFeatured: courses.isFeatured,
        isPublished: courses.isPublished,
        price: courses.price,
        discountPrice: courses.discountPrice,
        priceLocked: courses.priceLockedByAdmin,
        couponsEnabled: courses.couponsEnabled,
        adminNotes: courses.adminNotes,
      })
      .from(courses)
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .where(eq(courses.id, courseId))
    if (!course) throw new NotFoundException('Curso não encontrado')
    return {
      ...course,
      categoryName: course.categoryName || 'Sem Categoria',
      shortDescription: course.shortDescription ?? null,
      description: course.description || '',
      isFeatured: course.isFeatured ?? false,
      isPublished: course.isPublished,
      discountPrice: course.discountPrice ? course.discountPrice : null,
      priceLocked: course.priceLocked ?? false,
      couponsEnabled: course.couponsEnabled !== false,
      adminNotes: course.adminNotes || null,
    }
  }

  async getContent(courseId: number) {
    const modules = await this.db
      .select({
        id: courseModules.id,
        course_id: courseModules.courseId,
        title: courseModules.title,
        description: courseModules.description,
        display_order: courseModules.displayOrder,
        is_published: courseModules.isPublished,
        created_at: courseModules.createdAt,
        updated_at: courseModules.updatedAt,
      })
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.displayOrder), asc(courseModules.id))

    const empty = {
      modules: [],
      lessons: [],
      stats: { totalModules: 0, totalLessons: 0, totalDuration: 0, freePreviewCount: 0 },
    }
    if (modules.length === 0) return empty

    const lessons = await this.db
      .select({
        id: courseLessons.id,
        module_id: courseLessons.moduleId,
        title: courseLessons.title,
        description: courseLessons.description,
        type: courseLessons.type,
        content_url: courseLessons.contentUrl,
        content_text: courseLessons.contentText,
        duration_minutes: courseLessons.durationMinutes,
        display_order: courseLessons.displayOrder,
        is_free_preview: courseLessons.isFreePreview,
        is_published: courseLessons.isPublished,
        created_at: courseLessons.createdAt,
        updated_at: courseLessons.updatedAt,
      })
      .from(courseLessons)
      .where(
        inArray(
          courseLessons.moduleId,
          modules.map((module) => module.id),
        ),
      )
      .orderBy(asc(courseLessons.displayOrder), asc(courseLessons.id))

    return {
      modules,
      lessons,
      stats: {
        totalModules: modules.length,
        totalLessons: lessons.length,
        totalDuration: lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes ?? 0), 0),
        freePreviewCount: lessons.filter((lesson) => lesson.is_free_preview).length,
      },
    }
  }

  async getAudits(courseId: number) {
    return this.db
      .select({
        id: courseAudits.id,
        course_id: courseAudits.courseId,
        auditor_id: courseAudits.auditorId,
        decision: courseAudits.decision,
        feedback: courseAudits.feedback,
        changes_requested: courseAudits.changesRequested,
        created_at: courseAudits.createdAt,
      })
      .from(courseAudits)
      .where(eq(courseAudits.courseId, courseId))
      .orderBy(desc(courseAudits.createdAt), desc(courseAudits.id))
  }

  /** Curso completo no formato do assistente + configurações do admin (editor do admin). */
  async getEditor(courseId: number) {
    const [row] = await this.db
      .select({
        title: courses.title,
        producerId: courses.producerId,
        isFeatured: courses.isFeatured,
        couponsEnabled: courses.couponsEnabled,
        priceLockedByAdmin: courses.priceLockedByAdmin,
        adminNotes: courses.adminNotes,
      })
      .from(courses)
      .where(eq(courses.id, courseId))
    if (!row) throw new NotFoundException('Curso não encontrado')

    const course = await loadCourseForEdit(this.db, courseId)
    if (!course) throw new NotFoundException('Curso não encontrado')
    const { _status: _s, _producerId: _p, ...courseData } = course
    return {
      title: row.title,
      producerId: row.producerId,
      settings: {
        isFeatured: Boolean(row.isFeatured),
        couponsEnabled: row.couponsEnabled !== false,
        priceLockedByAdmin: Boolean(row.priceLockedByAdmin),
        adminNotes: row.adminNotes || '',
      },
      courseData,
    }
  }

  /** Painel de métricas de moderação. */
  async getMetrics() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const now = new Date()
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    // Mês do curso no fuso do Brasil, agrupado no banco (nada de carregar todos os cursos).
    const monthKey = sql<string>`to_char(${courses.createdAt} at time zone 'America/Sao_Paulo', 'YYYY-MM')`

    // Cinco consultas independentes: rodam juntas.
    const [[totals], [{ approvedThisMonth }], topCategories, topProducers, created] =
      await Promise.all([
        this.db
          .select({
            total: count(),
            pending: sql<number>`count(*) filter (where ${courses.status} = 'pending_review')::int`,
            approved: sql<number>`count(*) filter (where ${courses.status} = 'approved')::int`,
            rejected: sql<number>`count(*) filter (where ${courses.status} = 'rejected')::int`,
          })
          .from(courses),
        this.db
          .select({ approvedThisMonth: count() })
          .from(courses)
          .where(and(eq(courses.status, 'approved'), gte(courses.updatedAt, startOfMonth))),
        this.db
          .select({
            name: sql<string>`coalesce(${categories.name}, 'Sem categoria')`,
            count: count(),
          })
          .from(courses)
          .leftJoin(categories, eq(categories.id, courses.categoryId))
          .groupBy(categories.name)
          .orderBy(desc(count()))
          .limit(5),
        this.db
          .select({
            name: sql<string>`coalesce(${profiles.displayName}, ${profiles.fullName}, 'Sem produtor')`,
            count: count(),
          })
          .from(courses)
          .leftJoin(profiles, eq(profiles.id, courses.producerId))
          .groupBy(profiles.displayName, profiles.fullName)
          .orderBy(desc(count()))
          .limit(5),
        this.db
          .select({ key: monthKey, total: count() })
          .from(courses)
          .where(gte(courses.createdAt, windowStart))
          .groupBy(monthKey),
      ])

    const submitted = totals!.approved + totals!.rejected + totals!.pending
    const approvalRate = submitted > 0 ? (totals!.approved / submitted) * 100 : 0

    // Últimos 6 meses (inclusive o atual), mesmo os sem nenhum curso.
    const createdByMonth = new Map(created.map((row) => [row.key, row.total]))
    const submissionsByMonth = []
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      submissionsByMonth.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        count: createdByMonth.get(key) ?? 0,
      })
    }

    return {
      totalCourses: totals!.total,
      pendingReview: totals!.pending,
      approvedThisMonth,
      approvalRate: Math.round(approvalRate),
      topCategories,
      topProducers,
      submissionsByMonth,
    }
  }

  /** Produtores (ou alunos) para os seletores do admin. Inclui e-mail: só admin chega aqui. */
  async roleUsers(query: RoleUsersQuery) {
    let rows: Array<{ id: string; fullName: string; displayName: string | null; email: string }>

    if (query.role === 'student') {
      const adminIds = this.db
        .select({ id: userRoles.userId })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.role, 'admin'),
            eq(userRoles.isActive, true),
            isNull(userRoles.revokedAt),
          ),
        )
      rows = await this.db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          displayName: profiles.displayName,
          email: users.email,
        })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.id))
        .where(
          and(
            or(isNull(profiles.isActive), eq(profiles.isActive, true)),
            notInArray(profiles.id, adminIds),
          ),
        )
    } else {
      rows = await this.db
        .selectDistinct({
          id: profiles.id,
          fullName: profiles.fullName,
          displayName: profiles.displayName,
          email: users.email,
        })
        .from(userRoles)
        .innerJoin(profiles, eq(profiles.id, userRoles.userId))
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(
          and(
            eq(userRoles.role, 'producer'),
            eq(userRoles.isActive, true),
            isNull(userRoles.revokedAt),
          ),
        )
    }

    return rows
      .map((row) => ({
        id: row.id,
        name: row.displayName || row.fullName || 'Usuário',
        email: row.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  /**
   * Pré-visualização do curso (modo auditoria). Admin vê qualquer curso; produtor só o próprio.
   * Qualquer outro caso é "não encontrado".
   */
  async getPreview(user: SessionUser, courseId: number) {
    const isAdmin = user.roles.includes('admin')
    const [course] = await this.db
      .select({
        course: courses,
        categoryName: categories.name,
        categorySlug: categories.slug,
        producer: {
          id: profiles.id,
          fullName: profiles.fullName,
          displayName: profiles.displayName,
          slug: profiles.slug,
          publicProfileEnabled: profiles.publicProfileEnabled,
          bio: profiles.bio,
          avatarUrl: profiles.avatarUrl,
          expertiseAreas: profiles.expertiseAreas,
          averageRating: profiles.averageRating,
          totalStudents: profiles.totalStudents,
          totalCourses: profiles.totalCourses,
        },
      })
      .from(courses)
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .where(eq(courses.id, courseId))
    if (!course || (!isAdmin && course.course.producerId !== user.id)) {
      throw new NotFoundException('Curso não encontrado')
    }
    if (!isAdmin && !user.roles.includes('producer')) {
      throw new ForbiddenException('Você não tem permissão para esta ação')
    }

    const modules = await this.db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.displayOrder), asc(courseModules.id))
    const lessons =
      modules.length > 0
        ? await this.db
            .select()
            .from(courseLessons)
            .where(
              inArray(
                courseLessons.moduleId,
                modules.map((module) => module.id),
              ),
            )
            .orderBy(asc(courseLessons.displayOrder), asc(courseLessons.id))
        : []
    const [{ enrolled }] = await this.db
      .select({ enrolled: count() })
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))

    const c = course.course
    const p = course.producer
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description || '',
      short_description: c.shortDescription ?? null,
      thumbnail_url: c.thumbnailUrl,
      cover_image_url: c.coverImageUrl ?? null,
      trailer_url: c.trailerUrl ?? null,
      price: c.price,
      discount_price: c.discountPrice ?? null,
      average_rating: c.averageRating ?? null,
      level: c.level,
      total_duration_minutes: c.totalDurationMinutes || 0,
      total_lessons: c.totalLessons || 0,
      total_students: enrolled,
      total_reviews: c.totalReviews || 0,
      has_lifetime_access: c.hasLifetimeAccess,
      has_certificate: c.hasCertificate,
      status: c.status,
      is_published: c.isPublished,
      published_at: c.publishedAt ?? null,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      category: {
        id: c.categoryId,
        name: course.categoryName || 'Sem categoria',
        slug: course.categorySlug || '',
      },
      producer: {
        id: p?.id || '',
        name: p?.displayName || p?.fullName || 'Produtor',
        slug: p?.slug || null,
        public_profile_enabled: p?.publicProfileEnabled ?? false,
        avatar: p?.avatarUrl ?? null,
        bio: p?.bio ?? null,
        expertise_areas: p?.expertiseAreas || [],
        average_rating: p?.averageRating ?? null,
        total_students: p?.totalStudents || 0,
        total_courses: p?.totalCourses || 0,
      },
      modules: modules.map((module) => ({
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
            content_url: lesson.contentUrl ?? null,
            content_text: lesson.contentText ? sanitizeLessonHtml(lesson.contentText) : null,
            duration_minutes: lesson.durationMinutes,
            is_free_preview: lesson.isFreePreview,
            is_published: lesson.isPublished,
            display_order: lesson.displayOrder,
          })),
      })),
      stats: {
        total_students: enrolled,
        total_lessons: c.totalLessons || 0,
        total_reviews: c.totalReviews || 0,
        completion_rate: 0,
      },
      what_you_will_learn: c.whatYouWillLearn || [],
      requirements: c.requirements || [],
      target_audience: c.targetAudience || [],
    }
  }
}
