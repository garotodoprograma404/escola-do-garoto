import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { AuthModule } from '../auth/auth.module.js'
import { UsersModule } from '../users/users.module.js'
import { AdminCouponsController } from './admin-coupons.controller.js'
import { AdminCouponsService } from './admin-coupons.service.js'
import { AffiliateAttributionService } from './affiliate-attribution.service.js'
import { CartPricingService } from './cart-pricing.service.js'
import { CheckoutController } from './checkout.controller.js'
import { CouponsService } from './coupons.service.js'
import { DevPaymentsController } from './dev-payments.controller.js'
import { FinalizeAccountService } from './finalize-account.service.js'
import { FakeGateway } from './gateway/fake.gateway.js'
import { MercadoPagoGateway } from './gateway/mercadopago.gateway.js'
import { PaymentGateway } from './gateway/payment-gateway.js'
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller.js'
import { OrdersService } from './orders.service.js'
import { PaymentSettingsService } from './payment-settings.service.js'
import { PaymentsService } from './payments.service.js'

/**
 * Checkout: carrinho/cupom, pedido, pagamento (Mercado Pago), matrícula pós-pagamento e a gestão
 * de cupons do admin. O resto do sistema só enxerga o `PaymentGateway` (porta); Mercado Pago e o
 * simulador são implementações.
 */
@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, UsersModule],
  controllers: [
    CheckoutController,
    MercadoPagoWebhookController,
    DevPaymentsController,
    AdminCouponsController,
  ],
  providers: [
    OrdersService,
    PaymentsService,
    CartPricingService,
    CouponsService,
    AffiliateAttributionService,
    PaymentSettingsService,
    FinalizeAccountService,
    AdminCouponsService,
    {
      // O driver vem da configuração validada: `fake` só existe fora de produção (ver env.ts).
      provide: PaymentGateway,
      inject: [ENV],
      useFactory: (env: Env): PaymentGateway =>
        env.PAYMENT_DRIVER === 'mercadopago'
          ? new MercadoPagoGateway({
              accessToken: env.MERCADOPAGO_ACCESS_TOKEN!,
              webOrigin: env.WEB_ORIGIN,
              apiPublicUrl: env.API_PUBLIC_URL!,
            })
          : new FakeGateway(env.WEB_ORIGIN),
    },
  ],
  exports: [PaymentsService, PaymentSettingsService],
})
export class CheckoutModule {}
