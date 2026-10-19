import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, eq } from 'drizzle-orm'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { checkoutOrders } from '../../database/schema/index.js'
import { CurrentUser } from '../auth/decorators.js'
import {
  orderPublicIdSchema,
  simulatePaymentSchema,
  type SimulatePaymentInput,
} from './checkout.schemas.js'
import type { GatewayPayment } from './gateway/payment-gateway.js'
import { OrdersService } from './orders.service.js'
import type { OrderView } from './order-view.js'
import { PaymentsService } from './payments.service.js'

/** O simulador só responde com `PAYMENT_DRIVER=fake`, e em produção só no ambiente de demonstração. */
export function simulatorEnabled(
  env: Pick<Env, 'NODE_ENV' | 'PAYMENT_DRIVER' | 'DEMO_MODE'>,
): boolean {
  if (env.PAYMENT_DRIVER !== 'fake') return false
  return env.NODE_ENV !== 'production' || env.DEMO_MODE
}

/**
 * SIMULADOR DE PAGAMENTO, só para desenvolvimento e para o ambiente de demonstração
 * (`PAYMENT_DRIVER=fake`; em produção só com `DEMO_MODE`: trava no `env.ts`, e aqui a rota também
 * responde 404 fora desses modos). O resultado escolhido
 * entra por `PaymentsService.applyPayment`, o mesmo caminho do webhook real (valor, moeda e
 * referência conferidos).
 */
@Controller('dev/payments')
export class DevPaymentsController {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(OrdersService) private readonly orders: OrdersService,
  ) {}

  @Post(':publicId/simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(
    @CurrentUser() user: SessionUser,
    @Param('publicId', new ZodValidationPipe(orderPublicIdSchema)) publicId: string,
    @Body(new ZodValidationPipe(simulatePaymentSchema)) body: SimulatePaymentInput,
  ): Promise<OrderView> {
    if (!simulatorEnabled(this.env)) {
      throw new NotFoundException()
    }

    const [order] = await this.db
      .select({
        externalReference: checkoutOrders.externalReference,
        totalAmount: checkoutOrders.totalAmount,
      })
      .from(checkoutOrders)
      .where(and(eq(checkoutOrders.publicId, publicId), eq(checkoutOrders.userId, user.id)))
    if (!order) throw new NotFoundException('Pedido não encontrado.')

    const payment: GatewayPayment = {
      id: `fake-${publicId}`,
      status: body.outcome === 'approved' ? 'approved' : body.outcome,
      statusDetail: 'simulated',
      amountCents: Math.round(order.totalAmount * 100),
      currency: 'BRL',
      externalReference: order.externalReference,
      paymentTypeId: 'credit_card',
      lastUpdated: new Date().toISOString(),
    }
    await this.payments.applyPayment(payment, 'simulator')
    return this.orders.getOrder(user.id, publicId)
  }
}
