import { z } from 'zod'
import { centsToReais, reaisToCents } from '../money.js'
import {
  PaymentGateway,
  PaymentGatewayError,
  type CheckoutPaymentMethods,
  type CreateCheckoutInput,
  type CreatedCheckout,
  type GatewayPayment,
} from './payment-gateway.js'

const API_BASE = 'https://api.mercadopago.com'
const REQUEST_TIMEOUT_MS = 10_000

export type MercadoPagoConfig = {
  accessToken: string
  webOrigin: string
  apiPublicUrl: string
}

/**
 * Pagamento como o Mercado Pago devolve. Campos extras (dados do pagador etc.) são ignorados
 * de propósito: o que não é lido aqui nunca chega ao banco nem ao log.
 */
const paymentSchema = z.looseObject({
  id: z.union([z.number(), z.string()]),
  status: z.string(),
  status_detail: z.string().nullish(),
  transaction_amount: z.union([z.number(), z.string()]).nullish(),
  currency_id: z.string().nullish(),
  external_reference: z.string().nullish(),
  payment_type_id: z.string().nullish(),
  date_last_updated: z.string().nullish(),
})

const preferenceSchema = z.looseObject({ id: z.string(), init_point: z.url() })
const searchSchema = z.looseObject({ results: z.array(z.unknown()) })

export function parseMercadoPagoPayment(raw: unknown): GatewayPayment | null {
  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) return null
  const payment = parsed.data
  return {
    id: String(payment.id),
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    amountCents:
      payment.transaction_amount === null || payment.transaction_amount === undefined
        ? null
        : reaisToCents(payment.transaction_amount),
    currency: payment.currency_id ?? null,
    externalReference: payment.external_reference ?? null,
    paymentTypeId: payment.payment_type_id ?? null,
    lastUpdated: payment.date_last_updated ?? null,
  }
}

/**
 * Métodos que o checkout oferece, a partir das configurações da plataforma: o que está
 * desligado entra na lista de exclusões; parcelas só com cartão.
 */
export function buildPaymentMethods(methods: CheckoutPaymentMethods) {
  const excludedMethods: Array<{ id: string }> = []
  const excludedTypes: Array<{ id: string }> = []
  if (!methods.pixEnabled) excludedMethods.push({ id: 'pix' })
  if (!methods.boletoEnabled) excludedTypes.push({ id: 'ticket' })
  if (!methods.creditCardEnabled) {
    excludedTypes.push({ id: 'credit_card' }, { id: 'debit_card' }, { id: 'prepaid_card' })
  }

  const clamp = (value: number, fallback: number) =>
    Number.isFinite(value) ? Math.min(24, Math.max(1, Math.trunc(value))) : fallback

  const result: {
    excluded_payment_methods?: Array<{ id: string }>
    excluded_payment_types?: Array<{ id: string }>
    installments?: number
    default_installments?: number
  } = {}
  if (excludedMethods.length > 0) result.excluded_payment_methods = excludedMethods
  if (excludedTypes.length > 0) result.excluded_payment_types = excludedTypes
  if (methods.creditCardEnabled) {
    const installments = clamp(methods.maxInstallments, 12)
    result.installments = installments
    result.default_installments = Math.min(installments, clamp(methods.defaultInstallments, 1))
  }
  return result
}

/**
 * Checkout Pro (preferência + redirecionamento) do Mercado Pago, falando com a API por `fetch`.
 * Cinco endpoints, todos aqui: nada de SDK escondendo o que é enviado.
 */
export class MercadoPagoGateway extends PaymentGateway {
  constructor(
    private readonly config: MercadoPagoConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super()
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreatedCheckout> {
    // Páginas de retorno do checkout: sucesso, pendente e falha (todas acompanham o pedido).
    const backUrl = (page: 'success' | 'pending' | 'failure') => {
      const url = new URL(`/checkout/${page}`, this.config.webOrigin)
      url.searchParams.set('order_id', input.orderId)
      return url.toString()
    }

    const body = {
      // Uma linha só com o total do pedido: com cupom cobrindo um item, uma linha de R$ 0,00
      // seria recusada pelo gateway. O detalhe de cada curso fica no nosso pedido.
      items: [
        {
          id: input.orderId,
          title: input.title.slice(0, 250),
          quantity: 1,
          currency_id: 'BRL',
          unit_price: centsToReais(input.totalCents),
        },
      ],
      external_reference: input.orderId,
      payer: { email: input.payerEmail, name: input.payerName.slice(0, 80) },
      back_urls: {
        success: backUrl('success'),
        pending: backUrl('pending'),
        failure: backUrl('failure'),
      },
      auto_return: 'approved',
      notification_url: new URL(
        '/api/payments/mercadopago/webhook',
        this.config.apiPublicUrl,
      ).toString(),
      payment_methods: buildPaymentMethods(input.paymentMethods),
      expires: true,
      expiration_date_to: input.expiresAt.toISOString(),
      metadata: { order_id: input.orderId },
    }

    const raw = await this.request('POST', '/checkout/preferences', body)
    const preference = preferenceSchema.safeParse(raw)
    if (!preference.success)
      throw new PaymentGatewayError('Resposta inesperada ao criar o checkout')
    return { preferenceId: preference.data.id, checkoutUrl: preference.data.init_point }
  }

  async closeCheckout(preferenceId: string): Promise<void> {
    // O id vira parte da URL: só aceita o formato que o Mercado Pago gera.
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(preferenceId)) return
    await this.request('PUT', `/checkout/preferences/${preferenceId}`, {
      expires: true,
      expiration_date_to: new Date().toISOString(),
    })
  }

  async getPayment(paymentId: string): Promise<GatewayPayment | null> {
    // O id vira parte da URL: só aceita dígitos (nunca um caminho montado por quem chamou).
    if (!/^\d{1,20}$/.test(paymentId)) return null
    const raw = await this.request('GET', `/v1/payments/${paymentId}`, undefined, {
      allow404: true,
    })
    return raw === null ? null : parseMercadoPagoPayment(raw)
  }

  async findPaymentsByReference(orderId: string): Promise<GatewayPayment[]> {
    const query = new URLSearchParams({
      external_reference: orderId,
      sort: 'date_created',
      criteria: 'desc',
      limit: '5',
    })
    const raw = await this.request('GET', `/v1/payments/search?${query.toString()}`)
    const search = searchSchema.safeParse(raw)
    if (!search.success) return []
    return search.data.results.flatMap((item) => {
      const payment = parseMercadoPagoPayment(item)
      return payment ? [payment] : []
    })
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown,
    options: { allow404?: boolean } = {},
  ): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      // Sem detalhe do erro de rede: ele pode conter a URL/cabeçalhos.
      throw new PaymentGatewayError('Mercado Pago indisponível')
    }

    if (response.status === 404 && options.allow404) return null
    if (!response.ok) {
      // O corpo do erro NÃO entra na mensagem (pode ter dados do pagador); só o status.
      throw new PaymentGatewayError(`Mercado Pago respondeu ${response.status}`, response.status)
    }
    return response.json()
  }
}
