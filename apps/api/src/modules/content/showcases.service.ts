import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from 'drizzle-orm'
import { likeContains } from '../../common/search/like-contains.js'
import { DB, type Database } from '../../database/database.module.js'
import { categories, courses, profiles, showcases } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import type { ShowcaseBody } from './content.schemas.js'
import { moveInList } from './ordering.js'

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

/** Quantas vitrines a home resolve de uma vez e quantos cursos cada uma mostra no máximo. */
const MAX_PUBLIC_SHOWCASES = 20
const DEFAULT_COURSE_LIMIT = 8

const showcaseFields = {
  id: showcases.id,
  title: showcases.title,
  description: showcases.description,
  type: showcases.type,
  dynamic_filter: showcases.dynamicFilter,
  course_ids: showcases.courseIds,
  display_order: showcases.displayOrder,
  is_active: showcases.isActive,
  created_at: showcases.createdAt,
  updated_at: showcases.updatedAt,
}

/** O que a home vê de uma vitrine (sem ids de cursos nem datas internas). */
const publicShowcaseFields = {
  id: showcases.id,
  title: showcases.title,
  description: showcases.description,
  type: showcases.type,
  dynamic_filter: showcases.dynamicFilter,
  display_order: showcases.displayOrder,
  is_active: showcases.isActive,
}

/** Curso como a vitrine mostra (e como o seletor do admin lista). */
const courseCardFields = {
  id: courses.id,
  title: courses.title,
  slug: courses.slug,
  description: courses.description,
  thumbnail_url: courses.thumbnailUrl,
  price: courses.price,
  discount_price: courses.discountPrice,
  average_rating: courses.averageRating,
  total_students: courses.totalStudents,
  category_name: categories.name,
  producer_name: profiles.fullName,
  producer_avatar: profiles.avatarUrl,
}

type DynamicFilter = { rule?: 'bestsellers' | 'newest' | 'highest_rated'; limit?: number } | null

@Injectable()
export class ShowcasesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  listPublic() {
    return this.db
      .select(publicShowcaseFields)
      .from(showcases)
      .where(eq(showcases.isActive, true))
      .orderBy(asc(showcases.displayOrder), asc(showcases.id))
      .limit(MAX_PUBLIC_SHOWCASES)
  }

  private listActiveWithCourseIds() {
    return this.db
      .select(showcaseFields)
      .from(showcases)
      .where(eq(showcases.isActive, true))
      .orderBy(asc(showcases.displayOrder), asc(showcases.id))
      .limit(MAX_PUBLIC_SHOWCASES)
  }

  /**
   * Vitrines ativas já com os cursos de cada uma (a home faz UMA chamada em vez de uma por vitrine).
   * Só cursos publicados e aprovados. Manual: os escolhidos, na ordem escolhida. Dinâmica: pela regra.
   */
  async listPublicWithCourses() {
    const list = await this.listActiveWithCourseIds()
    const result: Array<{ showcase_id: number; courses: Array<Record<string, unknown>> }> = []
    for (const showcase of list) {
      const filter = showcase.dynamic_filter as DynamicFilter
      const limit = Math.min(Math.max(filter?.limit ?? DEFAULT_COURSE_LIMIT, 1), 20)
      const rows = await this.queryShowcaseCourses(showcase, filter, limit)
      result.push({ showcase_id: showcase.id, courses: rows })
    }
    return result
  }

  list() {
    return this.db
      .select(showcaseFields)
      .from(showcases)
      .orderBy(asc(showcases.displayOrder), asc(showcases.id))
  }

  async create(body: ShowcaseBody, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [last] = await tx
        .select({ next: sql<number>`coalesce(max(${showcases.displayOrder}), -1)::int + 1` })
        .from(showcases)

      const [created] = await tx
        .insert(showcases)
        .values({ ...this.toColumns(body), displayOrder: last?.next ?? 0 })
        .returning(showcaseFields)

      await this.audit.log(
        {
          userId: adminId,
          action: 'create',
          resourceType: 'showcase',
          resourceId: created!.id,
          changes: { title: body.title, type: body.type },
          ...request,
        },
        tx,
      )
      return created!
    })
  }

  async update(id: number, body: ShowcaseBody, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(showcases)
        .set({ ...this.toColumns(body), updatedAt: new Date() })
        .where(eq(showcases.id, id))
        .returning(showcaseFields)
      if (!updated) throw new NotFoundException('Vitrine não encontrada')

      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'showcase',
          resourceId: id,
          changes: { title: body.title, type: body.type, isActive: body.isActive },
          ...request,
        },
        tx,
      )
      return updated
    })
  }

  async remove(id: number, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(showcases)
        .where(eq(showcases.id, id))
        .returning({ id: showcases.id, title: showcases.title })
      if (!deleted) throw new NotFoundException('Vitrine não encontrada')
      await this.audit.log(
        {
          userId: adminId,
          action: 'delete',
          resourceType: 'showcase',
          resourceId: id,
          changes: { title: deleted.title },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  async move(id: number, direction: 'up' | 'down', adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: showcases.id })
        .from(showcases)
        .orderBy(asc(showcases.displayOrder), asc(showcases.id))
        .for('update')
      const reordered = moveInList(
        rows.map((row) => row.id),
        id,
        direction,
      )
      if (reordered === 'missing') throw new NotFoundException('Vitrine não encontrada')
      if (reordered === 'start')
        throw new BadRequestException('Vitrine já está na primeira posição')
      if (reordered === 'end') throw new BadRequestException('Vitrine já está na última posição')

      const now = new Date()
      for (const [position, showcaseId] of reordered.entries()) {
        await tx
          .update(showcases)
          .set({ displayOrder: position, updatedAt: now })
          .where(eq(showcases.id, showcaseId))
      }
      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'showcase',
          resourceId: id,
          changes: { moved: direction },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  /** Seletor do admin: cursos publicados e aprovados, até 50, pelo título. */
  searchCourses(search?: string) {
    const conditions: SQL[] = [eq(courses.isPublished, true), eq(courses.status, 'approved')]
    const term = search?.trim()
    if (term) conditions.push(likeContains(courses.title, term))
    return this.courseOptions(and(...conditions))
      .orderBy(asc(courses.title))
      .limit(50)
  }

  /** Cursos já escolhidos (qualquer status: a vitrine só mostra os publicados). */
  coursesByIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([])
    return this.courseOptions(inArray(courses.id, ids)).limit(50)
  }

  // --------------------------------------------------------------------------------------------

  private courseOptions(where: SQL | undefined) {
    return this.db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        thumbnail_url: courses.thumbnailUrl,
        price: courses.price,
        is_published: courses.isPublished,
        category_name: categories.name,
        producer_name: profiles.fullName,
      })
      .from(courses)
      .innerJoin(categories, eq(categories.id, courses.categoryId))
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .where(where)
  }

  private async queryShowcaseCourses(
    showcase: { type: 'manual' | 'dynamic'; course_ids: number[] | null },
    filter: DynamicFilter,
    limit: number,
  ): Promise<Array<Record<string, unknown>>> {
    const conditions: SQL[] = [eq(courses.isPublished, true), eq(courses.status, 'approved')]
    const manualIds = showcase.type === 'manual' ? (showcase.course_ids ?? []) : []
    if (manualIds.length > 0) conditions.push(inArray(courses.id, manualIds))

    let order: SQL[]
    if (showcase.type === 'dynamic' && filter?.rule === 'bestsellers') {
      order = [desc(courses.totalStudents), asc(courses.id)]
    } else if (showcase.type === 'dynamic' && filter?.rule === 'highest_rated') {
      conditions.push(isNotNull(courses.averageRating))
      order = [sql`${courses.averageRating} desc`, asc(courses.id)]
    } else {
      order = [desc(courses.createdAt), asc(courses.id)]
    }

    const rows = await this.db
      .select(courseCardFields)
      .from(courses)
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .leftJoin(profiles, eq(profiles.id, courses.producerId))
      .where(and(...conditions))
      .orderBy(...order)
      .limit(limit)

    if (manualIds.length > 0) {
      const position = new Map(manualIds.map((id, index) => [id, index]))
      rows.sort((a, b) => (position.get(a.id) ?? 1e9) - (position.get(b.id) ?? 1e9))
    }
    return rows
  }

  private toColumns(body: ShowcaseBody) {
    return {
      title: body.title,
      description: body.description,
      type: body.type,
      courseIds: body.type === 'manual' ? body.courseIds : null,
      // Guarda a regra e o limite juntos.
      dynamicFilter:
        body.type === 'dynamic' && body.dynamicRule
          ? { rule: body.dynamicRule, ...(body.limit ? { limit: body.limit } : {}) }
          : null,
      isActive: body.isActive,
    }
  }
}
