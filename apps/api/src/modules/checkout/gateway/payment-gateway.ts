/** Pagamento como o gateway o descreve, já normalizado (dinheiro em centavos inteiros). */
export type GatewayPayment = {
  id: string
  /** `approved`, `pending`, `rejected`… exatamente como o gateway devolve. */
  status: string
  statusDetail: string | null
  /** `null` quando o valor veio inválido: nesse caso o pagamento NUNCA libera o curso. */
  amountCents: number | null
  currency: string | null
  /** `public_id` do nosso pedido, enviado como `external_reference` na criação do checkout. */
  externalReference: string | null
  paymentTypeId: string | null
  lastUpdated: string | null
}

/** Métodos de pagamento habilitados nas configurações da plataforma (`platform_settings`). */
export type CheckoutPaymentMethods = {
  pixEnabled: boolean
  creditCardEnabled: boolean
  boletoEnabled: boolean
  maxInstallments: number
  defaultInstallments: number
}

export type CreateCheckoutInput = {
  /** `public_id` do pedido (vira o `external_reference` no gateway). */
  orderId: string
  title: string
  totalCents: number
  payerEmail: string
  payerName: string
  expiresAt: Date
  paymentMethods: CheckoutPaymentMethods
}

export type CreatedCheckout = { preferenceId: string; checkoutUrl: string }

/** O gateway respondeu com erro (ou ficou fora do ar). Nunca carrega token nem dados do pagador. */
export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message)
  }
}

/**
 * Porta do gateway de pagamento. O resto do sistema só conhece isto; Mercado Pago (produção) e
 * simulador (desenvolvimento) são implementações, e os testes usam uma terceira, controlada.
 */
export abstract class PaymentGateway {
  abstract createCheckout(input: CreateCheckoutInput): Promise<CreatedCheckout>
  /** `null` se o pagamento não existe nesse gateway. */
  abstract getPayment(paymentId: string): Promise<GatewayPayment | null>
  /**
   * Encerra o link de pagamento (a preferência deixa de aceitar pagamento). Usado quando o pedido é
   * substituído ou expira: sem isto o link "morto" ainda poderia ser pago depois de o cupom voltar.
   */
  abstract closeCheckout(preferenceId: string): Promise<void>
  /** Pagamentos ligados a um pedido (mais recentes primeiro). Usado para sincronizar sem webhook. */
  abstract findPaymentsByReference(orderId: string): Promise<GatewayPayment[]>
}

/** Produção sem credenciais do Mercado Pago cadastradas no painel: não há como cobrar. */
export class PaymentsNotConfiguredError extends PaymentGatewayError {
  constructor() {
    super('Pagamentos não configurados', 503)
  }
}
