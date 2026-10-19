import {
  PaymentGateway,
  type CreateCheckoutInput,
  type CreatedCheckout,
  type GatewayPayment,
} from './payment-gateway.js'

/**
 * Simulador (desenvolvimento sem credenciais e ambiente de demonstração): o "checkout" é uma página
 * local onde se escolhe o resultado. Não consulta nada fora; o resultado entra pelo mesmo caminho de
 * validação do webhook real (ver `PaymentsService.applyPayment`). Em produção só com `DEMO_MODE`
 * (ver `DynamicPaymentGateway`).
 */
export class FakeGateway extends PaymentGateway {
  constructor(private readonly webOrigin: string) {
    super()
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreatedCheckout> {
    const url = new URL('/checkout/simulador', this.webOrigin)
    url.searchParams.set('pedido', input.orderId)
    return { preferenceId: `fake-${input.orderId}`, checkoutUrl: url.toString() }
  }

  async closeCheckout(): Promise<void> {}

  async getPayment(): Promise<GatewayPayment | null> {
    return null
  }

  async findPaymentsByReference(): Promise<GatewayPayment[]> {
    return []
  }
}
