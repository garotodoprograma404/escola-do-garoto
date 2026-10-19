import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import {
  DEV_MASTER_SECRET,
  deriveSecretKey,
  openSecret,
  sealSecret,
} from '../../common/crypto/secret-box.js'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { mailSettings } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import type { MailSettingsInput } from './mail-settings.schemas.js'
import { SmtpMailService, type SmtpConfig } from './smtp-mail.service.js'

const PROVIDER = 'smtp'
const CACHE_MS = 30_000
/** Em produção só as portas de e-mail: o "conferir conexão" não vira sonda da rede interna. */
const PRODUCTION_PORTS = new Set([25, 465, 587, 2525])

/** Endereços internos (loopback, rede privada, link-local, CGNAT, ULA): proibidos em produção. */
const INTERNAL_ADDRESSES = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
] as const) {
  INTERNAL_ADDRESSES.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['::ffff:0:0', 96],
] as const) {
  INTERNAL_ADDRESSES.addSubnet(network, prefix, 'ipv6')
}

export type MailMode = 'smtp' | 'console' | 'disabled'

export type MailSettingsAdminView = {
  configured: boolean
  host: string | null
  port: number | null
  secure: boolean | null
  user: string | null
  passwordConfigured: boolean
  fromName: string | null
  fromEmail: string | null
  verifiedAt: string | null
  updatedAt: string | null
  /** A senha salva não abre mais (o `FILES_SIGNING_SECRET` mudou): cadastre de novo. */
  passwordUnreadable: boolean
  /** Como os e-mails saem agora: servidor do painel, só no log, ou não saem (produção sem servidor). */
  mode: MailMode
  /** Com `DEMO_MODE` o e-mail fica sempre no log e a configuração fica desligada. */
  demoMode: boolean
}

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

/** Produção sem servidor de e-mail cadastrado: nada é enviado (o admin vê o aviso no painel). */
export class MailNotConfiguredError extends Error {
  constructor() {
    super('Servidor de e-mail não configurado no painel')
  }
}

/**
 * Servidor de e-mail (SMTP) cadastrado pelo admin (painel → Configurações → E-mail), nada no `.env`.
 *
 * - A senha fica cifrada no banco; a chave vem do `FILES_SIGNING_SECRET`. Nunca volta para a tela.
 * - Ao salvar, o servidor é conferido de verdade (conecta e autentica): configuração errada não entra.
 * - O admin pode mandar um e-mail de teste para o PRÓPRIO e-mail (nunca para um endereço digitado).
 */
@Injectable()
export class MailSettingsService {
  private readonly logger = new Logger(MailSettingsService.name)
  private readonly key: Buffer
  private cache: { value: SmtpConfig | null; at: number } | undefined

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {
    this.key = deriveSecretKey(
      env.FILES_SIGNING_SECRET ?? DEV_MASTER_SECRET,
      'mail-smtp-credentials',
    )
  }

  /** Configuração para envio. `null` = nada cadastrado (ou a senha ficou ilegível). */
  async getSmtp(): Promise<SmtpConfig | null> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value
    const [row] = await this.db
      .select()
      .from(mailSettings)
      .where(eq(mailSettings.provider, PROVIDER))
    let value: SmtpConfig | null = null
    if (row) {
      const password = row.passwordSealed ? openSecret(row.passwordSealed, this.key) : undefined
      if (password === null) {
        this.logger.error(
          'Senha do e-mail ilegível (a chave do servidor mudou?): cadastre de novo no painel',
        )
      } else {
        value = this.toConfig({ ...row, user: row.smtpUser, password })
      }
    }
    this.cache = { value, at: Date.now() }
    return value
  }

  async mode(): Promise<MailMode> {
    if (this.env.DEMO_MODE) return 'console'
    if (await this.getSmtp()) return 'smtp'
    return this.env.NODE_ENV === 'production' ? 'disabled' : 'console'
  }

  async getAdminView(): Promise<MailSettingsAdminView> {
    const [row] = await this.db
      .select({
        host: mailSettings.host,
        port: mailSettings.port,
        secure: mailSettings.secure,
        user: mailSettings.smtpUser,
        passwordSealed: mailSettings.passwordSealed,
        fromName: mailSettings.fromName,
        fromEmail: mailSettings.fromEmail,
        verifiedAt: mailSettings.verifiedAt,
        updatedAt: mailSettings.updatedAt,
      })
      .from(mailSettings)
      .where(eq(mailSettings.provider, PROVIDER))
    const passwordUnreadable = Boolean(
      row?.passwordSealed && openSecret(row.passwordSealed, this.key) === null,
    )
    return {
      configured: Boolean(row),
      passwordUnreadable,
      host: row?.host ?? null,
      port: row?.port ?? null,
      secure: row?.secure ?? null,
      user: row?.user ?? null,
      passwordConfigured: Boolean(row?.passwordSealed),
      fromName: row?.fromName ?? null,
      fromEmail: row?.fromEmail ?? null,
      verifiedAt: row?.verifiedAt?.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      mode: await this.mode(),
      demoMode: this.env.DEMO_MODE,
    }
  }

  /** Salva (ou troca) o servidor. Antes de gravar, conecta e autentica de verdade. */
  async save(
    adminId: string,
    input: MailSettingsInput,
    request: RequestInfo = {},
  ): Promise<MailSettingsAdminView> {
    this.assertEditable()
    if (this.env.NODE_ENV === 'production') {
      if (!PRODUCTION_PORTS.has(input.port)) {
        throw new BadRequestException('Use uma porta de e-mail: 587 (STARTTLS), 465 (TLS) ou 2525.')
      }
      await assertPublicHost(input.host)
    }
    const user = input.user?.trim() || null
    const newPassword = input.password?.trim() ? input.password : undefined
    // Lido do banco (não do cache). A senha salva só é reaproveitada com o MESMO servidor, porta e
    // usuário: trocar o servidor exige digitar a senha de novo, senão ela seria enviada (no login
    // SMTP) para um servidor qualquer.
    const [saved] = await this.db
      .select({
        host: mailSettings.host,
        port: mailSettings.port,
        user: mailSettings.smtpUser,
        passwordSealed: mailSettings.passwordSealed,
      })
      .from(mailSettings)
      .where(eq(mailSettings.provider, PROVIDER))
    const sameServer =
      saved?.host.toLowerCase() === input.host.toLowerCase() &&
      saved.port === input.port &&
      saved.user === user
    const savedPassword =
      sameServer && saved.passwordSealed ? openSecret(saved.passwordSealed, this.key) : null
    const password = !user ? null : (newPassword ?? savedPassword)
    if (user && !password) {
      throw new BadRequestException(
        sameServer
          ? 'Informe a senha do servidor de e-mail.'
          : 'Servidor, porta ou usuário mudaram: informe a senha de novo.',
      )
    }

    const config = this.toConfig({ ...input, user, password: password ?? undefined })
    await this.verifyConfig(config)

    const now = new Date()
    const values = {
      host: input.host,
      port: input.port,
      secure: input.secure,
      smtpUser: user,
      passwordSealed: password ? sealSecret(password, this.key) : null,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      verifiedAt: now,
      updatedBy: adminId,
      updatedAt: now,
    }
    await this.db.transaction(async (tx) => {
      await tx
        .insert(mailSettings)
        .values({ provider: PROVIDER, ...values })
        .onConflictDoUpdate({ target: mailSettings.provider, set: values })
      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'mail_settings',
          resourceId: PROVIDER,
          // Nunca a senha: só o que dá para conferir.
          changes: {
            host: input.host,
            port: input.port,
            secure: input.secure,
            user,
            password: newPassword ? 'alterada' : password ? 'mantida' : 'sem senha',
            from: input.fromEmail,
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

  /** Confere de novo o servidor salvo (botão "Testar conexão"). */
  async check(): Promise<MailSettingsAdminView> {
    this.assertEditable()
    const config = await this.requireConfig()
    if (this.env.NODE_ENV === 'production') await assertPublicHost(config.host)
    await this.verifyConfig(config)
    await this.db
      .update(mailSettings)
      .set({ verifiedAt: new Date() })
      .where(eq(mailSettings.provider, PROVIDER))
    return this.getAdminView()
  }

  /** Manda um e-mail de teste para o próprio admin (o endereço vem da sessão, não do formulário). */
  async sendTest(adminEmail: string): Promise<{ sentTo: string }> {
    this.assertEditable()
    const config = await this.requireConfig()
    if (this.env.NODE_ENV === 'production') await assertPublicHost(config.host)
    try {
      await new SmtpMailService(config).send({
        to: adminEmail,
        subject: 'Teste de e-mail da plataforma',
        text: [
          'Olá!',
          '',
          'Se este e-mail chegou, o servidor de e-mail da plataforma está funcionando.',
          'Confirmação de cadastro, troca de senha e avisos já podem ser enviados.',
        ].join('\n'),
      })
    } catch (error) {
      throw new BadRequestException(friendlySmtpError(error))
    }
    return { sentTo: adminEmail }
  }

  async remove(adminId: string, request: RequestInfo = {}): Promise<MailSettingsAdminView> {
    this.assertEditable()
    await this.db.transaction(async (tx) => {
      await tx.delete(mailSettings).where(eq(mailSettings.provider, PROVIDER))
      await this.audit.log(
        {
          userId: adminId,
          action: 'delete',
          resourceType: 'mail_settings',
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

  /**
   * Na demonstração (aberta ao público) o e-mail fica só no log: ninguém configura um servidor nem
   * faz a API se conectar a endereços quaisquer.
   */
  private assertEditable() {
    if (this.env.DEMO_MODE) {
      throw new BadRequestException(
        'Na demonstração os e-mails ficam só no registro do servidor: a configuração fica desligada.',
      )
    }
  }

  private async requireConfig(): Promise<SmtpConfig> {
    const config = await this.getSmtp()
    if (!config) throw new BadRequestException('Nenhum servidor de e-mail cadastrado.')
    return config
  }

  private async verifyConfig(config: SmtpConfig) {
    try {
      await new SmtpMailService(config).verify()
    } catch (error) {
      throw new BadRequestException(friendlySmtpError(error))
    }
  }

  private toConfig(row: {
    host: string
    port: number
    secure: boolean
    user: string | null
    password?: string
    fromName: string
    fromEmail: string
  }): SmtpConfig {
    return {
      host: row.host,
      port: row.port,
      secure: row.secure,
      // Em produção o e-mail sempre vai criptografado: TLS direto ou STARTTLS obrigatório.
      requireTls: this.env.NODE_ENV === 'production',
      user: row.user ?? undefined,
      password: row.user ? row.password : undefined,
      // Objeto, não texto montado: nome com caracteres especiais nunca quebra o endereço.
      from: { name: row.fromName, address: row.fromEmail },
    }
  }
}

/**
 * Produção: o servidor de e-mail precisa ser um endereço público. Recusa IP interno digitado e nome
 * que resolve para a rede interna (container, localhost, rede privada), para o painel não servir de
 * sonda da rede do servidor.
 */
async function assertPublicHost(host: string) {
  const refuse = () =>
    new BadRequestException('Use o endereço público do servidor de e-mail do seu provedor.')
  let addresses: { address: string; family: number }[]
  try {
    addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new BadRequestException(
      'Não foi possível conectar ao servidor de e-mail. Confira o endereço e a porta.',
    )
  }
  const internal = addresses.some(({ address, family }) =>
    INTERNAL_ADDRESSES.check(address, family === 6 ? 'ipv6' : 'ipv4'),
  )
  if (addresses.length === 0 || internal) throw refuse()
}

/** Erro do servidor de e-mail em português, sem detalhe técnico (nunca usuário nem senha). */
function friendlySmtpError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : ''
  if (code === 'EAUTH') return 'O servidor recusou o usuário ou a senha. Confira os dois.'
  if (code === 'EENVELOPE') {
    return 'O servidor não aceitou o remetente. Use um e-mail do domínio liberado no seu provedor.'
  }
  if (code === 'ETLS' || /tls|ssl|certificate|wrong version/i.test(message)) {
    return 'Falha na conexão segura. Porta 465 usa "TLS direto"; porta 587 usa STARTTLS (desmarque TLS direto).'
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNREFUSED'].includes(code)) {
    return 'Não foi possível conectar ao servidor de e-mail. Confira o endereço e a porta.'
  }
  return 'O servidor de e-mail respondeu com erro. Confira os dados e tente de novo.'
}
