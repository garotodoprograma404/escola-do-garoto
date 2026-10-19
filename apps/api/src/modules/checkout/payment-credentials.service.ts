import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { deriveSecretKey, openSecret, sealSecret } from '../../common/crypto/secret-box.js'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { paymentGatewayCredentials } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import type { PaymentGatewayInput } from './payment-gateway.schemas.js'

const PROVIDER = 'mercadopago'
const API_BASE = 'https://api.mercadopago.com'
const VERIFY_TIMEOUT_MS = 10_000
const CACHE_MS = 30_000
const MERCADOPAGO_WEBHOOK_PATH = '/api/payments/mercadopago/webhook'

/**
 * Só para desenvolvimento sem `FILES_SIGNING_SECRET` (em produção ele é obrigatório, ver env.ts):
 * assim as credenciais salvas continuam legíveis depois de reiniciar a API local.
 */
const DEV_MASTER_SECRET = 'segredo-de-desenvolvimento-nao-use-em-producao'

export type MercadoPagoCredentials = {
  accessToken: string
  webhookSecret: string | null
  live: boolean
}

export type PaymentGatewayAdminView = {
  provider: 'mercadopago'
  configured: boolean
  /** `true` = credencial de produção (cobra de verdade); `false` = de teste. */
  live: boolean | null
  tokenHint: string | null
  webhookSecretConfigured: boolean
  accountLabel: string | null
  verifiedAt: string | null
  updatedAt: string | null
  /** URL para cadastrar em "Webhooks" no painel do Mercado Pago. */
  webhookUrl: string
  /** Com `DEMO_MODE` o pagamento é sempre o simulador, mesmo com credenciais salvas. */
  demoMode: boolean
}

const accountSchema = z.looseObject({
  nickname: z.string().nullish(),
  email: z.string().nullish(),
})

/** `APP_USR-1234…abcd`: o bastante para reconhecer o token, sem revelar o segredo. */
function tokenHint(token: string): string {
  const prefix = token.startsWith('TEST-') ? 'TEST-' : 'APP_USR-'
  return `${prefix}…${token.slice(-4)}`
}

/**
 * Credenciais do Mercado Pago cadastradas pelo admin (painel → Configurações → Financeiro).
 *
 * - Ficam cifradas no banco (`payment_gateway_credentials`); a chave vem do `FILES_SIGNING_SECRET`.
 * - Nunca voltam para a tela nem para o log: o painel vê a dica, a conta e o modo.
 * - Ao salvar, o token é conferido no próprio Mercado Pago (`/users/me`): token errado não entra.
 */
@Injectable()
export class PaymentCredentialsService {
  private readonly logger = new Logger(PaymentCredentialsService.name)
  private readonly key: Buffer
  private cache: { value: MercadoPagoCredentials | null; at: number } | undefined

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {
    if (!env.FILES_SIGNING_SECRET) {
      this.logger.warn(
        'Sem FILES_SIGNING_SECRET: credenciais de pagamento cifradas com a chave de desenvolvimento',
      )
    }
    this.key = deriveSecretKey(
      env.FILES_SIGNING_SECRET ?? DEV_MASTER_SECRET,
      'payment-gateway-credentials',
    )
  }

  webhookUrl(): string {
    return new URL(MERCADOPAGO_WEBHOOK_PATH, this.env.WEB_ORIGIN).toString()
  }

  /** Credenciais para uso do sistema (gateway e webhook). `null` = não configurado. */
  async getMercadoPago(): Promise<MercadoPagoCredentials | null> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value
    const [row] = await this.db
      .select()
      .from(paymentGatewayCredentials)
      .where(eq(paymentGatewayCredentials.provider, PROVIDER))
    let value: MercadoPagoCredentials | null = null
    if (row) {
      const accessToken = openSecret(row.accessTokenSealed, this.key)
      if (accessToken) {
        value = {
          accessToken,
          webhookSecret: row.webhookSecretSealed
            ? openSecret(row.webhookSecretSealed, this.key)
            : null,
          live: row.live,
        }
      } else {
        this.logger.error(
          'Credenciais do Mercado Pago ilegíveis (a chave do servidor mudou?): cadastre de novo no painel',
        )
      }
    }
    this.cache = { value, at: Date.now() }
    return value
  }

  /** Assinatura secreta do webhook cadastrada no painel (`null` = nenhum webhook é aceito). */
  async webhookSecret(): Promise<string | null> {
    return (await this.getMercadoPago())?.webhookSecret ?? null
  }

  async getAdminView(): Promise<PaymentGatewayAdminView> {
    const [row] = await this.db
      .select({
        live: paymentGatewayCredentials.live,
        tokenHint: paymentGatewayCredentials.tokenHint,
        webhookSecretSealed: paymentGatewayCredentials.webhookSecretSealed,
        accountLabel: paymentGatewayCredentials.accountLabel,
        verifiedAt: paymentGatewayCredentials.verifiedAt,
        updatedAt: paymentGatewayCredentials.updatedAt,
      })
      .from(paymentGatewayCredentials)
      .where(eq(paymentGatewayCredentials.provider, PROVIDER))
    return {
      provider: PROVIDER,
      configured: Boolean(row),
      live: row?.live ?? null,
      tokenHint: row?.tokenHint ?? null,
      webhookSecretConfigured: Boolean(row?.webhookSecretSealed),
      accountLabel: row?.accountLabel ?? null,
      verifiedAt: row?.verifiedAt?.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      webhookUrl: this.webhookUrl(),
      demoMode: this.env.DEMO_MODE,
    }
  }

  /**
   * Salva (ou troca) o token e/ou a assinatura do webhook. Campo ausente mantém o que já estava.
   * O token novo é conferido no Mercado Pago antes de gravar.
   */
  async save(
    adminId: string,
    input: PaymentGatewayInput,
    request: { ipAddress?: string | null; userAgent?: string | null } = {},
  ): Promise<PaymentGatewayAdminView> {
    const current = await this.getMercadoPago()
    const accessToken = input.accessToken ?? current?.accessToken
    if (!accessToken) {
      throw new BadRequestException('Informe o Access Token do Mercado Pago.')
    }
    const account = await this.verifyToken(accessToken)
    const webhookSecret =
      input.webhookSecret !== undefined ? input.webhookSecret : (current?.webhookSecret ?? null)
    const now = new Date()
    const values = {
      accessTokenSealed: sealSecret(accessToken, this.key),
      webhookSecretSealed: webhookSecret ? sealSecret(webhookSecret, this.key) : null,
      tokenHint: tokenHint(accessToken),
      live: !accessToken.startsWith('TEST-'),
      accountLabel: account,
      verifiedAt: now,
      updatedBy: adminId,
      updatedAt: now,
    }
    await this.db.transaction(async (tx) => {
      await tx
        .insert(paymentGatewayCredentials)
        .values({ provider: PROVIDER, ...values })
        .onConflictDoUpdate({ target: paymentGatewayCredentials.provider, set: values })
      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'payment_gateway_credentials',
          resourceId: PROVIDER,
          // Nunca o segredo: só o que mudou e a dica.
          changes: {
            accessToken: input.accessToken ? values.tokenHint : 'mantido',
            webhookSecret: input.webhookSecret !== undefined ? 'alterada' : 'mantida',
            live: values.live,
          },
          ipAddress: request.ipAddress ?? null,
          userAgent: request.userAgent ?? null,
        },
        tx,
      )
    })
    this.cache = undefined
    return this.getAdminView()
  }

  /** Confere de novo o token salvo (botão "Testar conexão"). */
  async check(): Promise<PaymentGatewayAdminView> {
    const current = await this.getMercadoPago()
    if (!current) throw new BadRequestException('Nenhuma credencial do Mercado Pago cadastrada.')
    const account = await this.verifyToken(current.accessToken)
    await this.db
      .update(paymentGatewayCredentials)
      .set({ accountLabel: account, verifiedAt: new Date() })
      .where(eq(paymentGatewayCredentials.provider, PROVIDER))
    return this.getAdminView()
  }

  async remove(
    adminId: string,
    request: { ipAddress?: string | null; userAgent?: string | null } = {},
  ): Promise<PaymentGatewayAdminView> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(paymentGatewayCredentials)
        .where(eq(paymentGatewayCredentials.provider, PROVIDER))
      await this.audit.log(
        {
          userId: adminId,
          action: 'delete',
          resourceType: 'payment_gateway_credentials',
          resourceId: PROVIDER,
          ipAddress: request.ipAddress ?? null,
          userAgent: request.userAgent ?? null,
        },
        tx,
      )
    })
    this.cache = undefined
    return this.getAdminView()
  }

  /** Pergunta ao Mercado Pago de quem é o token. Recusa token inválido com mensagem clara. */
  private async verifyToken(accessToken: string): Promise<string | null> {
    let response: Response
    try {
      response = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      })
    } catch {
      throw new BadRequestException(
        'Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.',
      )
    }
    if (response.status === 401 || response.status === 403) {
      throw new BadRequestException(
        'O Mercado Pago recusou este Access Token. Confira se copiou o token inteiro.',
      )
    }
    if (!response.ok) {
      throw new BadRequestException(
        `O Mercado Pago respondeu com erro (${response.status}). Tente de novo em instantes.`,
      )
    }
    const parsed = accountSchema.safeParse(await response.json().catch(() => null))
    return parsed.success ? (parsed.data.nickname ?? parsed.data.email ?? null) : null
  }
}
