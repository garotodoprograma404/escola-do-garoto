import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { withdrawals } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { NotificationsService } from '../notifications/notifications.service.js'
import { AdminFinanceService, type WithdrawalRequest } from './admin-finance.service.js'
import type { PayWithdrawalInput } from './finance.schemas.js'

type WithdrawalStatus = (typeof withdrawals.$inferSelect)['status']

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Ciclo de vida do saque, pelo ADMIN:
 *
 *   pending ──aprovar──▶ approved ──processar──▶ processing ──pagar──▶ completed
 *      └─────────────── rejeitar (de pending, approved ou processing) ──▶ rejected
 *
 * Cada passo é um `UPDATE … WHERE status IN (…)`: se outro admin (ou a própria pessoa, cancelando)
 * mexeu antes, a atualização não acerta nenhuma linha e a resposta é 409, em vez de sobrescrever
 * em silêncio. Toda mudança entra na
 * trilha de auditoria e avisa quem pediu.
 */
@Injectable()
export class AdminWithdrawalsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AdminFinanceService) private readonly finance: AdminFinanceService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  approve(adminId: string, id: number): Promise<WithdrawalRequest> {
    const now = new Date()
    return this.move(adminId, id, ['pending'], 'approved', {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: now,
    })
  }

  startProcessing(adminId: string, id: number): Promise<WithdrawalRequest> {
    return this.move(adminId, id, ['approved'], 'processing', {
      status: 'processing',
      processedAt: new Date(),
    })
  }

  reject(adminId: string, id: number, reason: string): Promise<WithdrawalRequest> {
    return this.move(adminId, id, ['pending', 'approved', 'processing'], 'rejected', {
      status: 'rejected',
      // Quem decidiu: o admin que rejeitou fica gravado neste mesmo campo.
      approvedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    })
  }

  pay(adminId: string, id: number, input: PayWithdrawalInput): Promise<WithdrawalRequest> {
    const now = new Date()
    return this.move(adminId, id, ['approved', 'processing'], 'completed', {
      status: 'completed',
      processedAt: now,
      completedAt: now,
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    })
  }

  private async move(
    adminId: string,
    id: number,
    from: WithdrawalStatus[],
    to: WithdrawalStatus,
    set: Partial<typeof withdrawals.$inferInsert>,
  ): Promise<WithdrawalRequest> {
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(withdrawals)
        .set(set)
        .where(and(eq(withdrawals.id, id), inArray(withdrawals.status, from)))
        .returning()
      if (!row) return undefined

      await this.audit.log(
        {
          userId: adminId,
          action: to === 'rejected' ? 'reject' : to === 'approved' ? 'approve' : 'update',
          resourceType: 'withdrawal',
          resourceId: id,
          changes: { to, from },
          metadata: { amount: row.amount, accountScope: row.accountScope },
        },
        tx,
      )
      await this.notifications.create(
        {
          userId: row.userId,
          type: `withdrawal_${to}`,
          title: NOTICE_TITLE[to] ?? 'Atualização do seu saque',
          message: `Seu saque de ${brl.format(row.amount)} agora está: ${STATUS_LABEL[to] ?? to}.${
            to === 'rejected' && row.rejectionReason ? ` Motivo: ${row.rejectionReason}` : ''
          }`,
          link: row.accountScope === 'affiliate' ? '/affiliate' : '/producer/financials',
          metadata: { withdrawalId: row.id },
        },
        tx,
      )
      return row
    })

    if (!updated) {
      const [current] = await this.db
        .select({ id: withdrawals.id, status: withdrawals.status })
        .from(withdrawals)
        .where(eq(withdrawals.id, id))
      if (!current) throw new NotFoundException('Saque não encontrado')
      throw new ConflictException(
        `Este saque não pode mais ser alterado desta forma (situação atual: ${STATUS_LABEL[current.status] ?? current.status}).`,
      )
    }
    const mapped = await this.finance.getWithdrawal(id)
    if (!mapped) throw new NotFoundException('Saque não encontrado')
    return mapped
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'pendente',
  approved: 'aprovado',
  processing: 'em processamento',
  completed: 'pago',
  rejected: 'rejeitado',
  cancelled: 'cancelado',
}

const NOTICE_TITLE: Record<string, string> = {
  approved: 'Saque aprovado',
  processing: 'Saque em processamento',
  completed: 'Saque pago',
  rejected: 'Saque rejeitado',
}
