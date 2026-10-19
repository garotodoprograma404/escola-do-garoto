import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { checkoutOrders } from '../../database/schema/index.js'
import { AuthService } from '../auth/auth.service.js'
import { UsersService } from '../users/users.service.js'
import { fulfillOrder, metadataOf } from './order-fulfillment.js'
import { CouponsService } from './coupons.service.js'
import { isPaidStatus } from './order-transition.js'

export type FinalizeAccountResult = { success: boolean; message: string; redirect_url: string }

/**
 * "Finalizar conta" depois da compra: quem pagou sem ter conta define a senha e a conta é criada.
 *
 * Ameaça evitada: criar a conta com o e-mail JÁ CONFIRMADO só porque alguém digitou o e-mail no
 * pedido deixaria quem soubesse o id do pedido definir a senha do e-mail de outra pessoa. Por isso
 * a conta nasce pelo cadastro normal (`AuthService.register`): a senha só vale depois que o dono do
 * e-mail abrir o link de confirmação.
 */
@Injectable()
export class FinalizeAccountService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(CouponsService) private readonly coupons: CouponsService,
  ) {}

  async finalize(publicId: string, password: string): Promise<FinalizeAccountResult> {
    const [order] = await this.db
      .select()
      .from(checkoutOrders)
      .where(eq(checkoutOrders.publicId, publicId))
    // Mesma resposta para pedido inexistente e para pedido que não é "sem conta".
    if (!order) throw new NotFoundException('Pedido não encontrado para finalizar conta.')

    const metadata = metadataOf(order)
    const pendingAccount =
      metadata.checkout_identity_mode === 'pending_account' ||
      (typeof metadata.pending_account === 'object' && metadata.pending_account !== null)

    if (!isPaidStatus(order.status) && order.status !== 'approved') {
      throw new BadRequestException('O pagamento ainda não foi aprovado para este pedido.')
    }
    if (typeof metadata.account_password_defined_at === 'string') {
      return {
        success: true,
        message: 'Sua senha já foi definida. Redirecionando para login...',
        redirect_url: '/login',
      }
    }
    if (order.userId || !pendingAccount) {
      throw new ConflictException('Esta conta já existia. Faça login para acessar seus cursos.')
    }

    const email = order.buyerEmail.trim().toLowerCase()
    const existing = await this.users.findAccountByEmail(email)
    if (existing) {
      // O e-mail do pedido já tem conta: o pedido é ligado a ela (quem pagou não perde a compra),
      // mas a senha NÃO muda. A pessoa entra com a senha dela.
      await this.linkAndFulfill(order.id, order.couponId, existing.id, false)
      throw new ConflictException(
        'Esta conta já existia. Faça login ou recupere sua senha para acessar seus cursos.',
      )
    }

    await this.auth.register({ name: order.buyerFullName, email, password })
    const created = await this.users.findAccountByEmail(email)
    if (!created) {
      throw new BadRequestException('Não foi possível preparar sua conta. Tente novamente.')
    }
    await this.linkAndFulfill(order.id, order.couponId, created.id, true)

    return {
      success: true,
      // Na demonstração a conta já nasce confirmada (não há e-mail de verdade).
      message: this.env.DEMO_MODE
        ? 'Conta criada! Já é só entrar com a senha escolhida.'
        : 'Conta criada! Enviamos um e-mail para confirmar seu endereço; depois é só entrar com a senha escolhida.',
      redirect_url: '/login',
    }
  }

  /**
   * Liga o pedido à conta e libera a matrícula (idempotente). Trava cupom e depois pedido (mesma
   * ordem do webhook) e RECONFERE o estado dentro da transação: um estorno que chegou no meio não é
   * "ressuscitado".
   */
  private async linkAndFulfill(
    orderId: number,
    couponId: number | null,
    userId: string,
    createdNow: boolean,
  ) {
    await this.db.transaction(async (tx) => {
      await this.coupons.lockById(tx, couponId)
      const [locked] = await tx
        .select()
        .from(checkoutOrders)
        .where(eq(checkoutOrders.id, orderId))
        .for('update')
      if (!locked || locked.userId || !isPaidStatus(locked.status)) return

      const next = {
        ...metadataOf(locked),
        pending_account: null,
        account_linked_after_payment: true,
        account_created_after_payment: createdNow,
        account_linked_user_id: userId,
        awaiting_account: false,
        ...(createdNow ? { account_password_defined_at: new Date().toISOString() } : {}),
      }
      await tx
        .update(checkoutOrders)
        .set({ userId, metadata: next })
        .where(eq(checkoutOrders.id, orderId))
      const free = locked.status === 'free_completed' || locked.totalAmount <= 0
      await fulfillOrder(
        tx,
        { ...locked, userId, metadata: next },
        {
          paymentId:
            locked.paymentId ?? (free ? `FREE_${locked.publicId}` : `ORDER_${locked.publicId}`),
          paymentMethod: locked.requestedPaymentMethod ?? (free ? 'free_coupon' : 'checkout_pro'),
          providerStatus: locked.providerStatus ?? (free ? 'free' : 'approved'),
          source: 'account_finalization',
          free,
        },
      )
    })
  }
}
