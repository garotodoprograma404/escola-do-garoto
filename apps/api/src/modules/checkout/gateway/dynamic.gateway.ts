import { Inject, Injectable } from '@nestjs/common'
import { ENV } from '../../../config/config.module.js'
import type { Env } from '../../../config/env.js'
import { PaymentCredentialsService } from '../payment-credentials.service.js'
import { FakeGateway } from './fake.gateway.js'
import { MercadoPagoGateway } from './mercadopago.gateway.js'
import {
  PaymentGateway,
  PaymentsNotConfiguredError,
  type CreateCheckoutInput,
  type CreatedCheckout,
  type GatewayPayment,
  type RefundPaymentInput,
} from './payment-gateway.js'

export type PaymentMode = 'mercadopago' | 'simulator' | 'disabled'

/**
 * Gateway escolhido a cada uso, pelo que o admin cadastrou no painel (nada no `.env`):
 *
 * - `DEMO_MODE`: sempre o simulador (a demonstração nunca cobra de verdade);
 * - credenciais do Mercado Pago salvas: Mercado Pago;
 * - sem credenciais, fora de produção: simulador (desenvolvimento);
 * - sem credenciais em produção: desligado (o checkout avisa que falta configurar).
 */
@Injectable()
export class DynamicPaymentGateway extends PaymentGateway {
  private readonly simulator: FakeGateway
  private mercadoPago: { token: string; gateway: MercadoPagoGateway } | undefined

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(PaymentCredentialsService) private readonly credentials: PaymentCredentialsService,
  ) {
    super()
    this.simulator = new FakeGateway(env.WEB_ORIGIN)
  }

  async mode(): Promise<PaymentMode> {
    if (this.env.DEMO_MODE) return 'simulator'
    if (await this.credentials.getMercadoPago()) return 'mercadopago'
    return this.env.NODE_ENV === 'production' ? 'disabled' : 'simulator'
  }

  createCheckout(input: CreateCheckoutInput): Promise<CreatedCheckout> {
    return this.current().then((gateway) => gateway.createCheckout(input))
  }

  getPayment(paymentId: string): Promise<GatewayPayment | null> {
    return this.current().then((gateway) => gateway.getPayment(paymentId))
  }

  closeCheckout(preferenceId: string): Promise<void> {
    return this.current().then((gateway) => gateway.closeCheckout(preferenceId))
  }

  findPaymentsByReference(orderId: string): Promise<GatewayPayment[]> {
    return this.current().then((gateway) => gateway.findPaymentsByReference(orderId))
  }

  override async simulatesPayments(): Promise<boolean> {
    return (await this.mode()) === 'simulator'
  }

  refundPayment(input: RefundPaymentInput): Promise<void> {
    return this.current().then((gateway) => gateway.refundPayment(input))
  }

  private async current(): Promise<PaymentGateway> {
    const mode = await this.mode()
    if (mode === 'simulator') return this.simulator
    if (mode === 'disabled') throw new PaymentsNotConfiguredError()
    const credentials = (await this.credentials.getMercadoPago())!
    if (this.mercadoPago?.token !== credentials.accessToken) {
      this.mercadoPago = {
        token: credentials.accessToken,
        gateway: new MercadoPagoGateway({
          accessToken: credentials.accessToken,
          webOrigin: this.env.WEB_ORIGIN,
          notificationUrl: this.credentials.webhookUrl(),
        }),
      }
    }
    return this.mercadoPago.gateway
  }
}
