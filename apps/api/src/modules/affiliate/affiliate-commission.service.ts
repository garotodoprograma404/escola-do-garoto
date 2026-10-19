import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, lte, ne, or, sql } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import {
  affiliateCoursePartnerships,
  affiliateLinks,
  transactions,
} from '../../database/schema/index.js'
import {
  AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS,
  getCommissionReleaseEligibleAt,
  isCommissionEligibleForRelease,
} from './affiliate-commission-release.js'
import { centsToReais, computeAffiliateCommissionCents } from './affiliate-money.js'
import type { ActiveAttribution } from './affiliate-attribution.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
/** Quantas comissões pendentes uma chamada de liberação examina (a próxima chamada pega o resto). */
const RELEASE_BATCH_SIZE = 500

export type RecordCommissionInput = {
  /** Quem comprou (id da sessão). Afiliado nunca ganha comissão da própria compra. */
  buyerUserId: string
  /** A atribuição devolvida por `AffiliateAttributionService.findActiveAttribution`. */
  attribution: Pick<
    ActiveAttribution,
    | 'attributionId'
    | 'attributionModel'
    | 'affiliateId'
    | 'affiliateLinkId'
    | 'partnershipId'
    | 'commissionRate'
    | 'attributedAt'
    | 'expiresAt'
  >
  order: {
    orderId: number | string
    orderPublicId: string
    /** Id do item do pedido: um item rende no máximo uma comissão, mesmo que chegue outro pagamento. */
    orderItemId: number | string
  }
  course: { courseId: number; courseTitle: string; producerId: string }
  sale: {
    /** Preço pago pelo item (após desconto). */
    grossSaleCents: number
    platformCommissionRate: number
    platformAmountCents: number
    /** Fatia do produtor ANTES de descontar o afiliado: é a base da comissão. */
    producerGrossCents: number
  }
  payment: { paymentId: string; paymentMethod: string | null; provider?: string }
  enrollmentId?: number | null
}

export type RecordCommissionResult =
  | { created: true; transactionId: number; commissionCents: number; producerNetCents: number }
  | {
      created: false
      reason: 'self_purchase' | 'no_commission' | 'already_recorded' | 'invalid_attribution'
      transactionId?: number
      commissionCents: number
      producerNetCents: number
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Comissões do afiliado (linhas `transactions` com `type = 'affiliate_commission'`).
 *
 * Pontos de integração usados pelo checkout:
 * - `computeAffiliateCommissionCents` (puro, em `affiliate-money.ts`) para saber quanto o afiliado
 *   leva e quanto sobra para o produtor, na hora de montar o pedido;
 * - `recordCommission` quando o pagamento é confirmado (idempotente);
 * - `reverseCommissionsForPayment` quando o pedido é reembolsado/cancelado.
 */
@Injectable()
export class AffiliateCommissionService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /**
   * Registra a comissão PENDENTE de um item pago. Seguro para repetir: o mesmo item do mesmo
   * pagamento nunca gera duas comissões (trava por pagamento dentro de transação).
   * Passe `executor` (a transação do checkout) para gravar junto com o resto do pedido.
   */
  async recordCommission(
    input: RecordCommissionInput,
    executor?: DbExecutor,
  ): Promise<RecordCommissionResult> {
    if (executor) return this.recordInExecutor(executor, input)
    return this.db.transaction((tx) => this.recordInExecutor(tx, input))
  }

  private async recordInExecutor(
    tx: DbExecutor,
    input: RecordCommissionInput,
  ): Promise<RecordCommissionResult> {
    const { affiliateCents, producerNetCents } = computeAffiliateCommissionCents(
      input.sale.producerGrossCents,
      input.attribution.commissionRate,
    )
    const none = (reason: Extract<RecordCommissionResult, { created: false }>['reason']) => ({
      created: false as const,
      reason,
      commissionCents: 0,
      producerNetCents: Math.max(0, Math.round(input.sale.producerGrossCents)),
    })

    // Fraude: o afiliado comprando o próprio link (ou conta igual) não gera comissão.
    if (input.buyerUserId === input.attribution.affiliateId) return none('self_purchase')
    if (affiliateCents <= 0) return none('no_commission')

    // O link e a parceria precisam existir, ser coerentes entre si e com o curso comprado.
    const [link] = await tx
      .select({
        code: affiliateLinks.code,
        partnershipId: affiliateLinks.partnershipId,
        affiliateId: affiliateCoursePartnerships.affiliateId,
        courseId: affiliateCoursePartnerships.courseId,
      })
      .from(affiliateLinks)
      .innerJoin(
        affiliateCoursePartnerships,
        eq(affiliateCoursePartnerships.id, affiliateLinks.partnershipId),
      )
      .where(eq(affiliateLinks.id, input.attribution.affiliateLinkId))
    if (
      !link ||
      link.partnershipId !== input.attribution.partnershipId ||
      link.affiliateId !== input.attribution.affiliateId ||
      link.courseId !== input.course.courseId
    ) {
      return none('invalid_attribution')
    }

    const orderItemId = String(input.order.orderItemId)
    // Trava por item do pedido: confirmações simultâneas (ou de pagamentos diferentes) esperam uma à outra.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`affiliate-commission-item:${orderItemId}`}, 0))`,
    )

    const [existing] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'affiliate_commission'),
          eq(transactions.userId, input.attribution.affiliateId),
          sql`${transactions.metadata}->>'order_item_id' = ${orderItemId}`,
        ),
      )
    if (existing) {
      return {
        created: false,
        reason: 'already_recorded',
        transactionId: existing.id,
        commissionCents: affiliateCents,
        producerNetCents,
      }
    }

    const commissionReais = centsToReais(affiliateCents)
    const [created] = await tx
      .insert(transactions)
      .values({
        userId: input.attribution.affiliateId,
        type: 'affiliate_commission',
        amount: commissionReais,
        status: 'pending',
        paymentMethod: input.payment.paymentMethod,
        paymentId: input.payment.paymentId,
        courseId: null,
        enrollmentId: input.enrollmentId ?? null,
        metadata: {
          source: 'affiliate_commission_pending',
          provider: input.payment.provider ?? 'mercadopago',
          order_id: input.order.orderId,
          order_item_id: orderItemId,
          order_public_id: input.order.orderPublicId,
          buyer_user_id: input.buyerUserId,
          producer_id: input.course.producerId,
          course_id: input.course.courseId,
          course_title: input.course.courseTitle,
          gross_sale_amount: centsToReais(input.sale.grossSaleCents),
          platform_commission_rate: input.sale.platformCommissionRate,
          platform_commission_amount: centsToReais(input.sale.platformAmountCents),
          producer_gross_amount: centsToReais(input.sale.producerGrossCents),
          affiliate_commission_rate: input.attribution.commissionRate,
          affiliate_commission_amount: commissionReais,
          producer_net_amount: centsToReais(producerNetCents),
          affiliate_link_id: input.attribution.affiliateLinkId,
          affiliate_link_code: link.code,
          partnership_id: input.attribution.partnershipId,
          attribution_id: input.attribution.attributionId,
          attribution_model: input.attribution.attributionModel,
          attributed_at: input.attribution.attributedAt,
          expires_at: input.attribution.expiresAt,
          release_status: 'pending_refund_window',
        },
      })
      .returning({ id: transactions.id })

    return {
      created: true,
      transactionId: created!.id,
      commissionCents: affiliateCents,
      producerNetCents,
    }
  }

  /**
   * Pedido reembolsado (`refunded`) ou cancelado/falho (`failed`): marca as comissões daquele
   * pagamento. Devolve quantas linhas mudaram. Idempotente.
   */
  async reverseCommissionsForPayment(
    input: {
      paymentId: string
      status: 'refunded' | 'failed'
      orderStatus: string
      orderId?: number | string
      orderPublicId?: string
    },
    executor: DbExecutor = this.db,
  ): Promise<number> {
    const paymentId = input.paymentId.trim()
    if (!paymentId) return 0

    const rows = await executor
      .update(transactions)
      .set({
        status: input.status,
        metadata: sql`coalesce(${transactions.metadata}, '{}'::jsonb) || ${JSON.stringify({
          order_status_sync_at: new Date().toISOString(),
          order_status_sync: input.orderStatus,
          ...(input.orderId === undefined ? {} : { order_id: input.orderId }),
          ...(input.orderPublicId === undefined ? {} : { order_public_id: input.orderPublicId }),
        })}::jsonb`,
      })
      .where(
        and(
          eq(transactions.type, 'affiliate_commission'),
          eq(transactions.paymentId, paymentId),
          ne(transactions.status, input.status),
        ),
      )
      .returning({ id: transactions.id })
    return rows.length
  }

  /**
   * Libera as comissões pendentes que já passaram da janela de reembolso (30 dias), tornando-as
   * saldo sacável. É "oportunista": roda antes de mostrar painel/extrato
   * e antes de um saque. Sem `userId`, vale para todos os afiliados (painel do admin).
   * Devolve quantas foram liberadas.
   */
  async releaseEligibleCommissions(
    userId?: string,
    executor: DbExecutor = this.db,
  ): Promise<number> {
    const now = new Date()
    const cutoff = new Date(now.getTime() - AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS * ONE_DAY_MS)

    const pending = await executor
      .select({
        id: transactions.id,
        status: transactions.status,
        createdAt: transactions.createdAt,
        metadata: transactions.metadata,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'affiliate_commission'),
          eq(transactions.status, 'pending'),
          userId ? eq(transactions.userId, userId) : undefined,
          // Pré-filtro barato: passou de 30 dias ou tem data de liberação explícita.
          or(
            lte(transactions.createdAt, cutoff),
            sql`jsonb_exists(coalesce(${transactions.metadata}, '{}'::jsonb), 'release_eligible_at')`,
          ),
        ),
      )
      .orderBy(asc(transactions.createdAt))
      .limit(RELEASE_BATCH_SIZE)

    const eligible = pending.filter((row) =>
      isCommissionEligibleForRelease({
        createdAt: row.createdAt,
        status: row.status,
        metadata: row.metadata,
        now,
      }),
    )

    let released = 0
    for (const row of eligible) {
      const current = isRecord(row.metadata) ? row.metadata : {}
      const updated = await executor
        .update(transactions)
        .set({
          status: 'completed',
          metadata: {
            ...current,
            release_window_days: AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS,
            release_eligible_at: getCommissionReleaseEligibleAt(
              row.createdAt,
              row.metadata,
            ).toISOString(),
            release_status: 'completed',
            release_completed_at: now.toISOString(),
            release_completed_by: 'system_opportunistic',
          },
        })
        // `status = pending` de novo: se outra chamada liberou/estornou no meio, não sobrescreve.
        .where(and(eq(transactions.id, row.id), eq(transactions.status, 'pending')))
        .returning({ id: transactions.id })
      released += updated.length
    }
    return released
  }
}
