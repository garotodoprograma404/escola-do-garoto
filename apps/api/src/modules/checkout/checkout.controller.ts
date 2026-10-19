import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public } from '../auth/decorators.js'
import { CHECKOUT_RATE_LIMITS } from './checkout.constants.js'
import {
  applyCouponSchema,
  createOrderSchema,
  finalizeAccountSchema,
  orderPublicIdSchema,
  type ApplyCouponInput,
  type CreateOrderInput,
  type FinalizeAccountInput,
} from './checkout.schemas.js'
import { FinalizeAccountService, type FinalizeAccountResult } from './finalize-account.service.js'
import type { CheckoutPaymentMethods } from './gateway/payment-gateway.js'
import { OrdersService, type CouponApplication, type CreatedOrder } from './orders.service.js'
import type { OrderView } from './order-view.js'
import { PaymentSettingsService } from './payment-settings.service.js'

const publicIdPipe = new ZodValidationPipe(orderPublicIdSchema)

/**
 * Compra de cursos. Toda rota exige sessão (que só existe para e-mail confirmado), exceto as
 * duas marcadas. O pedido é sempre do usuário da SESSÃO: nunca há `userId` vindo do cliente.
 */
@Controller('checkout')
export class CheckoutController {
  constructor(
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(PaymentSettingsService) private readonly settings: PaymentSettingsService,
    @Inject(FinalizeAccountService) private readonly finalizeAccount: FinalizeAccountService,
  ) {}

  /** Métodos de pagamento ligados no admin (a tela só mostra o que está ligado). Dado público. */
  @Public()
  @Get('payment-options')
  paymentOptions(): Promise<CheckoutPaymentMethods> {
    return this.settings.getPaymentOptions()
  }

  @Post('coupons/apply')
  @Throttle(CHECKOUT_RATE_LIMITS.applyCoupon)
  @HttpCode(HttpStatus.OK)
  applyCoupon(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(applyCouponSchema)) body: ApplyCouponInput,
  ): Promise<CouponApplication> {
    return this.orders.applyCoupon(user, body)
  }

  @Post('orders')
  @Throttle(CHECKOUT_RATE_LIMITS.createOrder)
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput,
  ): Promise<CreatedOrder> {
    return this.orders.createOrder(user, body)
  }

  @Get('orders/:publicId')
  getOrder(
    @CurrentUser() user: SessionUser,
    @Param('publicId', publicIdPipe) publicId: string,
  ): Promise<OrderView> {
    return this.orders.getOrder(user.id, publicId)
  }

  @Post('orders/:publicId/sync')
  @Throttle(CHECKOUT_RATE_LIMITS.syncOrder)
  @HttpCode(HttpStatus.OK)
  syncOrder(
    @CurrentUser() user: SessionUser,
    @Param('publicId', publicIdPipe) publicId: string,
  ): Promise<OrderView> {
    return this.orders.syncOrder(user.id, publicId)
  }

  /** Pedido sem dono (compra sem conta), para a tela de finalizar conta. Pública, por id secreto. */
  @Public()
  @Get('orders/:publicId/guest')
  @Throttle(CHECKOUT_RATE_LIMITS.finalizeAccount)
  getGuestOrder(@Param('publicId', publicIdPipe) publicId: string): Promise<OrderView> {
    return this.orders.getGuestOrder(publicId)
  }

  /**
   * Compra feita sem conta: depois de paga, a pessoa define a senha e a conta nasce (com o e-mail
   * ainda por confirmar). Pública, porque quem chega aqui ainda não tem conta; o pedido (id
   * impossível de adivinhar) e o estado dele fazem o controle.
   */
  @Public()
  @Post('orders/:publicId/finalize-account')
  @Throttle(CHECKOUT_RATE_LIMITS.finalizeAccount)
  @HttpCode(HttpStatus.OK)
  finalizeAccountForOrder(
    @Param('publicId', publicIdPipe) publicId: string,
    @Body(new ZodValidationPipe(finalizeAccountSchema)) body: FinalizeAccountInput,
  ): Promise<FinalizeAccountResult> {
    return this.finalizeAccount.finalize(publicId, body.password)
  }
}
