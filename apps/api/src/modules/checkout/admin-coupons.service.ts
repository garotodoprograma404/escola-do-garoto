import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, count, desc, eq, inArray, isNotNull, ne, or, sql, sum } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import {
  checkoutOrders,
  couponUsage,
  coupons,
  courses,
  profiles,
} from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import type { CouponFormInput, CouponListQuery } from './admin-coupons.schemas.js'

type CouponStatus = 'active' | 'inactive' | 'expired' | 'depleted'

export type AdminCoupon = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description: string
  status: CouponStatus
  usageLimit: number | null
  usageCount: number
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  validFrom: string
  validUntil: string | null
  applicableCourses: string[]
  applicableCourseTitles: string[]
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

type CouponRow = typeof coupons.$inferSelect

/** Status de exibição do cupom. O contador da linha inclui as reservas. */
function couponStatusOf(
  coupon: Pick<CouponRow, 'isActive' | 'validUntil' | 'usageLimit' | 'usageCount'>,
  now = new Date(),
): CouponStatus {
  if (!coupon.isActive) return 'inactive'
  if (coupon.validUntil && coupon.validUntil < now) return 'expired'
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return 'depleted'
  return 'active'
}

/** Texto de busca seguro para `ILIKE`: normaliza primeiro e só depois escapa `\ % _`. */
function likePattern(text: string): string {
  const normalized = text.normalize('NFKC').replace(/[\\%_]/g, (char) => `\\${char}`)
  return `%${normalized}%`
}

/**
 * Gestão de cupons (só admin). O acesso é restrito por `@Roles(['admin'])` no controller e cada
 * mudança entra na trilha de auditoria.
 */
@Injectable()
export class AdminCouponsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(query: CouponListQuery): Promise<AdminCoupon[]> {
    const search = query.search ? likePattern(query.search) : null
    const rows = await this.db
      .select()
      .from(coupons)
      .where(
        and(
          query.type !== 'ALL' ? eq(coupons.type, query.type) : undefined,
          search
            ? or(
                sql`${coupons.code} ilike ${search}`,
                sql`${coupons.name} ilike ${search}`,
                sql`coalesce(${coupons.description}, '') ilike ${search}`,
              )
            : undefined,
        ),
      )
      .orderBy(desc(coupons.createdAt), desc(coupons.id))
      .limit(1000)
    const mapped = await this.toAdminCoupons(rows)
    return query.status === 'ALL'
      ? mapped
      : mapped.filter((coupon) => coupon.status === query.status)
  }

  async get(id: number): Promise<AdminCoupon> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.id, id))
    if (!row) throw new NotFoundException('Cupom não encontrado')
    return (await this.toAdminCoupons([row]))[0]!
  }

  async stats() {
    const [[couponStats], [usage], [orders], [couponOrders]] = await Promise.all([
      this.db.select({ total: count() }).from(coupons),
      this.db
        .select({ total: count(), discount: sum(couponUsage.discountAmount) })
        .from(couponUsage),
      this.db.select({ total: count() }).from(checkoutOrders),
      this.db
        .select({ total: count() })
        .from(checkoutOrders)
        .where(isNotNull(checkoutOrders.couponId)),
    ])

    const all = await this.db
      .select({
        isActive: coupons.isActive,
        validUntil: coupons.validUntil,
        usageLimit: coupons.usageLimit,
        usageCount: coupons.usageCount,
      })
      .from(coupons)
    const now = new Date()
    const totalUsage = usage?.total ?? 0
    const totalDiscountGiven = Math.round(Number(usage?.discount ?? 0) * 100) / 100
    const totalOrders = orders?.total ?? 0
    const withCoupon = couponOrders?.total ?? 0
    return {
      totalCoupons: couponStats?.total ?? 0,
      activeCoupons: all.filter((coupon) => couponStatusOf(coupon, now) === 'active').length,
      totalUsage,
      totalDiscountGiven,
      averageDiscountPerUse:
        totalUsage > 0 ? Math.round((totalDiscountGiven / totalUsage) * 100) / 100 : 0,
      conversionRate:
        totalOrders > 0 && withCoupon > 0
          ? Number(((withCoupon / totalOrders) * 100).toFixed(1))
          : 0,
    }
  }

  async usage(couponId: number) {
    const [coupon] = await this.db
      .select({ id: coupons.id, code: coupons.code })
      .from(coupons)
      .where(eq(coupons.id, couponId))
    if (!coupon) throw new NotFoundException('Cupom não encontrado')

    const rows = await this.db
      .select({
        id: couponUsage.id,
        userId: couponUsage.userId,
        userName: profiles.fullName,
        courseId: couponUsage.courseId,
        courseTitle: courses.title,
        originalAmount: couponUsage.originalAmount,
        discountAmount: couponUsage.discountAmount,
        finalAmount: couponUsage.finalAmount,
        usedAt: couponUsage.usedAt,
      })
      .from(couponUsage)
      .leftJoin(profiles, eq(profiles.id, couponUsage.userId))
      .leftJoin(courses, eq(courses.id, couponUsage.courseId))
      .where(eq(couponUsage.couponId, couponId))
      .orderBy(desc(couponUsage.usedAt))
      .limit(500)

    return rows.map((row) => ({
      id: String(row.id),
      couponId: String(coupon.id),
      couponCode: coupon.code,
      userId: row.userId,
      userName: row.userName ?? 'Usuário',
      userEmail: '',
      courseId: row.courseId === null ? '' : String(row.courseId),
      courseName: row.courseTitle ?? '',
      originalPrice: row.originalAmount,
      discountAmount: row.discountAmount,
      finalPrice: row.finalAmount,
      usedAt: row.usedAt.toISOString(),
    }))
  }

  /** `true` se NINGUÉM usa este código (disponível para criar). */
  async isCodeAvailable(code: string, exceptId?: number): Promise<boolean> {
    const [row] = await this.db
      .select({ id: coupons.id })
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code.trim().toUpperCase()),
          exceptId ? ne(coupons.id, exceptId) : undefined,
        ),
      )
    return !row
  }

  async courseOptions() {
    const rows = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        price: courses.price,
        discountPrice: courses.discountPrice,
        couponsEnabled: courses.couponsEnabled,
      })
      .from(courses)
      .where(and(eq(courses.status, 'approved'), eq(courses.isPublished, true)))
      .orderBy(courses.title)
      .limit(2000)
    return rows.map((row) => ({
      id: String(row.id),
      title: row.title,
      price: row.price,
      discountPrice: row.discountPrice,
      couponsEnabled: row.couponsEnabled !== false,
    }))
  }

  async create(adminId: string, input: CouponFormInput): Promise<AdminCoupon> {
    await this.assertCourseScope(input.applicableCourses)
    try {
      const [created] = await this.db
        .insert(coupons)
        .values({
          code: input.code,
          name: input.description?.trim() || input.code,
          description: input.description?.trim() || null,
          type: input.type,
          value: input.value,
          usageLimit: input.usageLimit,
          minPurchaseAmount: input.minPurchaseAmount || null,
          maxDiscountAmount: input.maxDiscountAmount || null,
          validFrom: new Date(input.validFrom),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          applicableCourseIds: input.applicableCourses.length > 0 ? input.applicableCourses : null,
          isActive: true,
          createdBy: adminId,
        })
        .returning()
      await this.audit.log({
        userId: adminId,
        action: 'create',
        resourceType: 'coupon',
        resourceId: created!.id,
        changes: { code: created!.code, type: created!.type, value: created!.value },
      })
      return (await this.toAdminCoupons([created!]))[0]!
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Já existe um cupom com este código')
      throw error
    }
  }

  async update(adminId: string, id: number, input: CouponFormInput): Promise<AdminCoupon> {
    await this.assertCourseScope(input.applicableCourses)
    try {
      const [updated] = await this.db
        .update(coupons)
        .set({
          code: input.code,
          name: input.description?.trim() || input.code,
          description: input.description?.trim() || null,
          type: input.type,
          value: input.value,
          usageLimit: input.usageLimit,
          minPurchaseAmount: input.minPurchaseAmount || null,
          maxDiscountAmount: input.maxDiscountAmount || null,
          validFrom: new Date(input.validFrom),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          applicableCourseIds: input.applicableCourses.length > 0 ? input.applicableCourses : null,
        })
        .where(eq(coupons.id, id))
        .returning()
      if (!updated) throw new NotFoundException('Cupom não encontrado')
      await this.audit.log({
        userId: adminId,
        action: 'update',
        resourceType: 'coupon',
        resourceId: id,
        changes: { code: updated.code, type: updated.type, value: updated.value },
      })
      return (await this.toAdminCoupons([updated]))[0]!
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('Já existe um cupom com este código')
      throw error
    }
  }

  /** Liga/desliga o cupom (o botão da tabela). */
  async toggle(adminId: string, id: number): Promise<AdminCoupon> {
    const [updated] = await this.db
      .update(coupons)
      .set({ isActive: sql`not ${coupons.isActive}` })
      .where(eq(coupons.id, id))
      .returning()
    if (!updated) throw new NotFoundException('Cupom não encontrado')
    await this.audit.log({
      userId: adminId,
      action: updated.isActive ? 'activate' : 'deactivate',
      resourceType: 'coupon',
      resourceId: id,
    })
    return (await this.toAdminCoupons([updated]))[0]!
  }

  async remove(adminId: string, id: number): Promise<void> {
    // Excluir apagaria em cascata o histórico de uso (e zeraria o "uma vez por pessoa" se o código
    // fosse recriado). Cupom que já foi usado em pedido só pode ser desativado.
    const [used] = await this.db
      .select({ total: count() })
      .from(couponUsage)
      .where(eq(couponUsage.couponId, id))
    const [ordered] = await this.db
      .select({ total: count() })
      .from(checkoutOrders)
      .where(eq(checkoutOrders.couponId, id))
    if ((used?.total ?? 0) + (ordered?.total ?? 0) > 0) {
      throw new ConflictException(
        'Este cupom já foi usado em pedidos e não pode ser excluído. Desative-o.',
      )
    }
    const [removed] = await this.db
      .delete(coupons)
      .where(eq(coupons.id, id))
      .returning({ id: coupons.id, code: coupons.code })
    if (!removed) throw new NotFoundException('Cupom não encontrado')
    await this.audit.log({
      userId: adminId,
      action: 'delete',
      resourceType: 'coupon',
      resourceId: id,
      changes: { code: removed.code },
    })
  }

  /** Os cursos do cupom precisam existir, estar à venda e aceitar cupom. */
  private async assertCourseScope(courseIds: number[]) {
    if (courseIds.length === 0) return
    const found = await this.db
      .select({
        id: courses.id,
        title: courses.title,
        status: courses.status,
        isPublished: courses.isPublished,
        couponsEnabled: courses.couponsEnabled,
      })
      .from(courses)
      .where(inArray(courses.id, courseIds))
    if (found.length !== new Set(courseIds).size) {
      throw new BadRequestException('Um ou mais cursos selecionados não existem mais')
    }
    const invalid = found.find((course) => course.status !== 'approved' || !course.isPublished)
    if (invalid) {
      throw new BadRequestException(`O curso "${invalid.title}" não está elegível para cupons`)
    }
    const disabled = found.find((course) => course.couponsEnabled === false)
    if (disabled) {
      throw new BadRequestException(`O curso "${disabled.title}" está com cupons desabilitados`)
    }
  }

  private async toAdminCoupons(rows: CouponRow[]): Promise<AdminCoupon[]> {
    if (rows.length === 0) return []
    const courseIds = [...new Set(rows.flatMap((row) => row.applicableCourseIds ?? []))]
    const creatorIds = [...new Set(rows.flatMap((row) => (row.createdBy ? [row.createdBy] : [])))]
    const couponIds = rows.map((row) => row.id)

    const [courseRows, creatorRows, usageRows] = await Promise.all([
      courseIds.length > 0
        ? this.db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(inArray(courses.id, courseIds))
        : [],
      creatorIds.length > 0
        ? this.db
            .select({ id: profiles.id, fullName: profiles.fullName })
            .from(profiles)
            .where(inArray(profiles.id, creatorIds))
        : [],
      this.db
        .select({ couponId: couponUsage.couponId, total: count() })
        .from(couponUsage)
        .where(inArray(couponUsage.couponId, couponIds))
        .groupBy(couponUsage.couponId),
    ])
    const titleById = new Map(courseRows.map((row) => [row.id, row.title]))
    const creatorById = new Map(creatorRows.map((row) => [row.id, row.fullName]))
    const usageById = new Map(usageRows.map((row) => [row.couponId, row.total]))
    const now = new Date()

    return rows.map((row) => ({
      id: String(row.id),
      code: row.code,
      type: row.type,
      value: row.value,
      description: row.description || row.name || '',
      status: couponStatusOf(row, now),
      usageLimit: row.usageLimit,
      usageCount: usageById.get(row.id) ?? 0,
      minPurchaseAmount: row.minPurchaseAmount ? row.minPurchaseAmount : null,
      maxDiscountAmount: row.maxDiscountAmount ? row.maxDiscountAmount : null,
      validFrom: row.validFrom.toISOString(),
      validUntil: row.validUntil?.toISOString() ?? null,
      applicableCourses: (row.applicableCourseIds ?? []).map(String),
      applicableCourseTitles: (row.applicableCourseIds ?? []).flatMap((id) => {
        const title = titleById.get(id)
        return title ? [title] : []
      }),
      createdBy: row.createdBy ?? '',
      createdByName: row.createdBy ? (creatorById.get(row.createdBy) ?? 'Admin') : 'Admin',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  }
}
