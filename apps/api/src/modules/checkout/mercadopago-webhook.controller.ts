import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../auth/decorators.js'
import { PaymentGateway, PaymentGatewayError } from './gateway/payment-gateway.js'
import { verifyMercadoPagoSignature } from './gateway/webhook-signature.js'
import { PaymentCredentialsService } from './payment-credentials.service.js'
import { PaymentsService } from './payments.service.js'

const PAYMENT_ID = /^\d{1,20}$/

/** Notificação IDÊNTICA (mesma assinatura) repetida dentro desta janela é só confirmada, sem consultar o gateway. */
const REPLAY_WINDOW_MS = 2 * 60_000
const REPLAY_CACHE_MAX = 5_000

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

/**
 * Notificações do Mercado Pago. Pública (o gateway não tem sessão), protegida pela ASSINATURA.
 *
 * O corpo da notificação só diz "o pagamento X mudou": quem decide o que aconteceu é o pagamento
 * reconsultado na API do gateway, e `PaymentsService.applyPayment` confere valor, moeda e pedido.
 * Sem limite por IP: o gateway reenvia em rajadas, e o que protege é a assinatura (HMAC barato).
 *
 * A assinatura `x-signature` é obrigatória: um `?token=` na URL seria comparado sem tempo constante
 * e vazaria em log, e aceitar a notificação sem nada deixaria qualquer um forjar pagamentos.
 */
@Public()
@SkipThrottle()
@Controller('payments/mercadopago')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name)
  private readonly recentlySeen = new Map<string, number>()

  constructor(
    @Inject(PaymentCredentialsService) private readonly credentials: PaymentCredentialsService,
    @Inject(PaymentGateway) private readonly gateway: PaymentGateway,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ): Promise<{ received: true }> {
    // Assinatura secreta cadastrada no painel do admin (sem ela, nenhum webhook é aceito).
    const secret = (await this.credentials.webhookSecret()) ?? undefined
    const valid =
      secret !== undefined &&
      verifyMercadoPagoSignature({
        secret,
        signatureHeader: signature,
        requestId,
        // A assinatura é sobre o `data.id` da QUERY (é assim que a documentação define).
        dataId: asString(query['data.id']),
      })
    if (!valid) {
      this.logger.warn('Webhook do Mercado Pago com assinatura inválida')
      throw new UnauthorizedException()
    }

    // Reenvio em rajada de uma notificação capturada não vira rajada de consultas ao Mercado Pago (que
    // gastariam a cota do nosso token). As entregas legítimas de reenvio chegam minutos depois.
    const replayKey = `${requestId ?? ''}|${signature ?? ''}`
    const now = Date.now()
    const seenAt = this.recentlySeen.get(replayKey)
    if (seenAt !== undefined && now - seenAt < REPLAY_WINDOW_MS) return { received: true }
    if (this.recentlySeen.size >= REPLAY_CACHE_MAX) {
      for (const [key, at] of this.recentlySeen) {
        if (now - at >= REPLAY_WINDOW_MS) this.recentlySeen.delete(key)
      }
      if (this.recentlySeen.size >= REPLAY_CACHE_MAX) this.recentlySeen.clear()
    }
    this.recentlySeen.set(replayKey, now)

    const payload = (typeof body === 'object' && body !== null ? body : {}) as { type?: unknown }
    const type = asString(query.type) ?? asString(query.topic) ?? asString(payload.type)
    // Outros tipos (merchant_order, planos…) não mudam pedidos: confirma recebimento e segue.
    if (type !== 'payment') return { received: true }

    // O id processado é SEMPRE o assinado: o `data.id` da query. Um id só no corpo não estaria
    // coberto pela assinatura, então a notificação é ignorada.
    const rawId = asString(query['data.id']) ?? ''
    // O id vira parte de uma URL na consulta ao gateway: só aceita número.
    if (!PAYMENT_ID.test(rawId)) return { received: true }

    try {
      const payment = await this.gateway.getPayment(rawId)
      if (payment) await this.payments.applyPayment(payment, 'webhook')
    } catch (error) {
      // Falhou: a próxima entrega desta notificação precisa ser processada, não ignorada.
      this.recentlySeen.delete(replayKey)
      // Gateway fora do ar: responde erro para o Mercado Pago TENTAR DE NOVO (15 min, 30 min, 6 h…).
      if (error instanceof PaymentGatewayError) {
        this.logger.warn(`Consulta do pagamento ${rawId} falhou: ${error.message}`)
        throw new ServiceUnavailableException()
      }
      throw error
    }
    return { received: true }
  }
}
