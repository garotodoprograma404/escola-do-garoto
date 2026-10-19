import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import type { DbExecutor } from '../../database/database.module.js'
import { courses, enrollments } from '../../database/schema/index.js'
import { computeCouponDiscount, CouponRejectedError, type CartLine } from './coupon-discount.js'
import { CouponsService, type CouponRow } from './coupons.service.js'
import { dbToCents } from './money.js'

type PricedLine = {
  courseId: number
  slug: string
  title: string
  producerId: string
  categoryId: number
  /** Preço que vale hoje (promoção do curso, se houver), antes do cupom. */
  listedCents: number
  discountCents: number
  finalCents: number
}

export type PricedCart = {
  lines: PricedLine[]
  coupon: CouponRow | null
  eligibleCourseIds: number[]
  subtotalCents: number
  discountCents: number
  totalCents: number
}

/** Preço de tabela ou promocional: o promocional só vale se for MENOR e maior que zero. */
function effectivePriceCents(price: number, discountPrice: number | null): number {
  const regular = dbToCents(price)
  const promo = dbToCents(discountPrice)
  return promo > 0 && promo < regular ? promo : regular
}

/**
 * Calcula o carrinho a partir do banco (nada vem do cliente além de ids e código de cupom):
 * confere se cada curso pode ser comprado por esta pessoa, aplica a promoção do curso e depois o
 * cupom. Usado igualmente pela tela do carrinho ("aplicar cupom") e pela criação do pedido.
 */
@Injectable()
export class CartPricingService {
  constructor(@Inject(CouponsService) private readonly couponsService: CouponsService) {}

  async priceCart(
    executor: DbExecutor,
    input: {
      userId: string
      courseIds: number[]
      couponCode?: string
      /** Trava a linha do cupom (criação de pedido). */
      lockCoupon?: boolean
    },
  ): Promise<PricedCart> {
    const rows = await executor
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        producerId: courses.producerId,
        categoryId: courses.categoryId,
        price: courses.price,
        discountPrice: courses.discountPrice,
        status: courses.status,
        isPublished: courses.isPublished,
        couponsEnabled: courses.couponsEnabled,
      })
      .from(courses)
      .where(inArray(courses.id, input.courseIds))

    if (rows.length !== input.courseIds.length) {
      throw new BadRequestException('Erro ao validar cursos do carrinho')
    }
    const unavailable = rows.find((course) => !course.isPublished || course.status !== 'approved')
    if (unavailable) {
      // Sem o título: quem testa ids não descobre nome de curso em rascunho/reprovado de outro produtor.
      throw new BadRequestException('Um dos cursos do carrinho não está disponível para compra.')
    }
    if (rows.some((course) => course.producerId === input.userId)) {
      throw new BadRequestException('Você não pode comprar o seu próprio curso.')
    }

    // Matrícula ativa ou concluída bloqueia a compra. Matrícula estornada/cancelada não: a pessoa
    // pode comprar de novo (a mesma matrícula é reativada).
    const owned = await executor
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, input.userId),
          inArray(enrollments.courseId, input.courseIds),
          inArray(enrollments.status, ['active', 'completed']),
        ),
      )
    if (owned.length > 0) {
      throw new ConflictException(`Você já possui ${owned.length} curso(s) deste carrinho.`)
    }

    const byId = new Map(rows.map((row) => [row.id, row]))
    const lines: PricedLine[] = input.courseIds.map((id) => {
      const course = byId.get(id)!
      const listedCents = effectivePriceCents(course.price, course.discountPrice)
      return {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        producerId: course.producerId,
        categoryId: course.categoryId,
        listedCents,
        discountCents: 0,
        finalCents: listedCents,
      }
    })
    const subtotalCents = lines.reduce((sum, line) => sum + line.listedCents, 0)

    if (!input.couponCode) {
      return {
        lines,
        coupon: null,
        eligibleCourseIds: [],
        subtotalCents,
        discountCents: 0,
        totalCents: subtotalCents,
      }
    }

    const coupon = this.couponsService.assertValidNow(
      await this.couponsService.findByCode(executor, input.couponCode, { lock: input.lockCoupon }),
    )
    await this.couponsService.assertAvailableForUser(executor, coupon, input.userId)

    const cart: CartLine[] = lines.map((line) => ({
      courseId: line.courseId,
      categoryId: line.categoryId,
      priceCents: line.listedCents,
      couponsEnabled: byId.get(line.courseId)!.couponsEnabled !== false,
    }))

    let discount
    try {
      discount = computeCouponDiscount(this.couponsService.toRule(coupon), cart)
    } catch (error) {
      if (error instanceof CouponRejectedError) throw new BadRequestException(error.message)
      throw error
    }

    lines.forEach((line, index) => {
      line.discountCents = discount.perLineCents[index]!
      line.finalCents = line.listedCents - line.discountCents
    })
    return {
      lines,
      coupon,
      eligibleCourseIds: discount.eligibleCourseIds,
      subtotalCents,
      discountCents: discount.totalDiscountCents,
      totalCents: subtotalCents - discount.totalDiscountCents,
    }
  }
}
