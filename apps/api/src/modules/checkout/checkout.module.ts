import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
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
import { DynamicPaymentGateway } from './gateway/dynamic.gateway.js'
import { PaymentGateway } from './gateway/payment-gateway.js'
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller.js'
import { OrdersService } from './orders.service.js'
import { PaymentCredentialsService } from './payment-credentials.service.js'
import { AdminPaymentGatewayController } from './admin-payment-gateway.controller.js'
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
    AdminPaymentGatewayController,
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
    PaymentCredentialsService,
    DynamicPaymentGateway,
    // O resto do sistema só conhece a porta `PaymentGateway`; quem decide o gateway real é o
    // `DynamicPaymentGateway`, pelo que o admin cadastrou no painel.
    { provide: PaymentGateway, useExisting: DynamicPaymentGateway },
  ],
  exports: [PaymentsService, PaymentSettingsService],
})
export class CheckoutModule {}
