import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { and, count, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { checkoutOrders, couponUsage, coupons } from '../../database/schema/index.js'
import { dbToCents } from './money.js'
import type { CouponRule } from './coupon-discount.js'
import { HOLDING_ORDER_STATUSES } from './order-transition.js'

export type CouponRow = typeof coupons.$inferSelect

const INVALID_COUPON = 'Cupom inválido ou expirado'

/**
 * Regras de cupom compartilhadas pelo carrinho e pelo pedido.
 *
 * Contador: `coupons.usage_count` conta as reservas (pedido pendente) MAIS os usos já consumidos.
 * Reserva e devolução são atualizações atômicas da própria linha, então dois pedidos ao mesmo
 * tempo nunca passam do `usage_limit`. O uso por pessoa fica em `coupon_usage` (gravado quando o
 * pedido é pago).
 */
@Injectable()
export class CouponsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Busca pelo código. Com `lock`, trava a linha até o fim da transação. */
  async findByCode(
    executor: DbExecutor,
    code: string,
    options: { lock?: boolean } = {},
  ): Promise<CouponRow | undefined> {
    const query = executor.select().from(coupons).where(eq(coupons.code, code))
    const [coupon] = await (options.lock ? query.for('update') : query)
    return coupon
  }

  /**
   * Trava a linha do cupom até o fim da transação. REGRA DE ORDEM (evita deadlock): quem precisa
   * das duas travas pega SEMPRE a do cupom ANTES da do pedido (criar pedido, webhook, expiração).
   */
  async lockById(executor: DbExecutor, couponId: number | null | undefined) {
    if (!couponId) return
    await executor
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.id, couponId))
      .for('update')
  }

  /**
   * Cupom que existe e está valendo agora. Inexistente, desligado, ainda não iniciado e vencido
   * respondem a MESMA mensagem: quem tenta adivinhar códigos não descobre qual é qual.
   */
  assertValidNow(coupon: CouponRow | undefined, now = new Date()): CouponRow {
    if (
      !coupon ||
      !coupon.isActive ||
      coupon.validFrom > now ||
      (coupon.validUntil !== null && coupon.validUntil < now)
    ) {
      throw new BadRequestException(INVALID_COUPON)
    }
    return coupon
  }

  /**
   * Limite total e uso por pessoa. A reserva que a PRÓPRIA pessoa já tem num pedido pendente não
   * conta contra ela (ela está só voltando para pagar).
   */
  async assertAvailableForUser(executor: DbExecutor, coupon: CouponRow, userId: string) {
    const [used] = await executor
      .select({ total: count() })
      .from(couponUsage)
      .where(and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId)))
    if ((used?.total ?? 0) > 0) throw new BadRequestException('Você já usou este cupom')

    if (coupon.usageLimit !== null) {
      const [own] = await executor
        .select({ total: count() })
        .from(checkoutOrders)
        .where(
          and(
            eq(checkoutOrders.userId, userId),
            eq(checkoutOrders.couponId, coupon.id),
            inArray(checkoutOrders.status, [...HOLDING_ORDER_STATUSES]),
            sql`${checkoutOrders.metadata}->>'coupon_reservation' = 'reserved'`,
          ),
        )
      if (coupon.usageCount - (own?.total ?? 0) >= coupon.usageLimit) {
        throw new BadRequestException('Este cupom atingiu o limite de uso')
      }
    }
  }

  /** Regra de desconto (em centavos) a partir da linha do banco. */
  toRule(coupon: CouponRow): CouponRule {
    const percentage = coupon.type === 'percentage'
    return {
      type: coupon.type,
      value: percentage ? Math.round(coupon.value * 100) : dbToCents(coupon.value),
      minSubtotalCents: coupon.minPurchaseAmount ? dbToCents(coupon.minPurchaseAmount) : null,
      maxDiscountCents: coupon.maxDiscountAmount ? dbToCents(coupon.maxDiscountAmount) : null,
      applicableCourseIds: coupon.applicableCourseIds,
      applicableCategoryIds: coupon.applicableCategoryIds,
    }
  }

  /**
   * Reserva um uso, atomicamente: o `UPDATE` só acontece enquanto há vaga. `false` = esgotado.
   */
  async reserve(tx: DbExecutor, couponId: number): Promise<boolean> {
    const updated = await tx
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(
        and(
          eq(coupons.id, couponId),
          or(isNull(coupons.usageLimit), lt(coupons.usageCount, coupons.usageLimit)),
        ),
      )
      .returning({ id: coupons.id })
    return updated.length > 0
  }

  /** Conta um uso SEM olhar o limite: o pagamento já foi recebido (pedido pago depois de expirar). */
  async forceCount(tx: DbExecutor, couponId: number) {
    await tx
      .update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(eq(coupons.id, couponId))
  }

  /** Devolve um uso reservado (pedido falhou, expirou ou foi substituído). */
  async release(tx: DbExecutor, couponId: number) {
    await tx
      .update(coupons)
      .set({ usageCount: sql`greatest(${coupons.usageCount} - 1, 0)` })
      .where(eq(coupons.id, couponId))
  }
}
