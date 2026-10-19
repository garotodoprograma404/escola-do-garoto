import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  EMAIL_NOT_VERIFIED,
  safeInternalPath,
  type ApiErrorBody,
  type EmailVerificationPreview,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type SessionUser,
  type VerifyEmailInput,
} from '@vox/contracts'
import { and, desc, eq, gt, isNull, lt, ne } from 'drizzle-orm'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { DB, type Database } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import { emailVerificationTokens, passwordResetTokens, users } from '../../database/schema/index.js'
import { MailSettingsService } from '../mail/mail-settings.service.js'
import { MailService } from '../mail/mail.service.js'
import { UsersService } from '../users/users.service.js'
import {
  EMAIL_VERIFICATION_COOLDOWN_MS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
} from './auth.constants.js'
import { generateToken, hashToken } from './crypto/opaque-token.js'
import { hashPassword, needsRehash, verifyPassword } from './crypto/password-hasher.js'
import { accountExistsMail, emailVerificationMail } from './mail/email-verification.mail.js'
import { passwordResetMail } from './mail/password-reset.mail.js'
import { DEMO_ACCOUNTS, type DemoLoginInput } from './demo-accounts.js'
import { SessionsService, type CreatedSession, type SessionClient } from './sessions.service.js'

export type AuthResult = { user: SessionUser; session: CreatedSession }

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos'
const INVALID_LINK = 'Link inválido ou expirado. Peça um novo link.'
const DEFAULT_AFTER_VERIFY = '/minha-conta'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  /** Hash de referência para gastar o mesmo tempo quando o e-mail não existe (anti enumeração). */
  private readonly dummyHash = hashPassword(generateToken())

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(MailSettingsService) private readonly mailSettings: MailSettingsService,
  ) {}

  /**
   * Cadastro NEUTRO: quem chama recebe sempre a mesma resposta, exista o e-mail ou não, e não ganha
   * sessão. Só quem abre o link enviado ao e-mail entra (ver `verifyEmail`).
   *
   * - e-mail novo → cria a conta (sem confirmar) e envia o link de confirmação;
   * - e-mail pendente → NÃO troca nada na conta: gera um link novo que carrega as credenciais
   *   DESTE cadastro. Cada link ativa a conta com as credenciais do cadastro que o gerou, então um
   *   segundo cadastro com o mesmo e-mail não muda o que o dono do primeiro link vai ativar;
   * - e-mail já confirmado → nada muda; o dono recebe um aviso "você já tem conta".
   */
  async register(input: RegisterInput): Promise<void> {
    // Produção sem servidor de e-mail: ninguém receberia o link de confirmação, então o cadastro
    // avisa em vez de prometer um e-mail que não sai (o primeiro admin nasce por `admin:create`).
    if ((await this.mailSettings.mode()) === 'disabled') {
      throw new ServiceUnavailableException(
        'O cadastro está temporariamente indisponível: a plataforma ainda não configurou o envio de e-mails. Tente mais tarde.',
      )
    }
    // Hash sempre, mesmo quando não vai ser usado: o tempo de resposta não denuncia a situação da conta.
    const passwordHash = await hashPassword(input.password)
    const existing = await this.users.findAccountByEmail(input.email)

    if (existing && (existing.emailVerifiedAt || existing.status !== 'active')) {
      // No máximo um aviso por hora por conta: ninguém usa isto para lotar a caixa de outra pessoa.
      if (await this.users.claimAccountExistsNotice(existing.id)) {
        this.sendMail(
          accountExistsMail(this.accountExistsLinks(input.email)),
          'aviso de conta existente',
        )
      }
      return
    }

    let userId: string
    if (existing) {
      // Tentativa repetida logo depois de outra (60 s): ignorada por inteiro. Nem e-mail novo, nem
      // credencial nova: o que já foi enviado continua valendo.
      if (await this.hasRecentVerification(existing.id)) return
      userId = existing.id
    } else {
      try {
        userId = await this.db.transaction(async (tx) => {
          const id = await this.users.createUserWithRole(
            tx,
            { name: input.name, email: input.email, passwordHash },
            'student',
          )
          // Demonstração: não há e-mail de verdade, então a conta nova já nasce confirmada.
          if (this.env.DEMO_MODE) await this.users.markEmailVerified(tx, id)
          return id
        })
      } catch (error) {
        // Corrida: outro cadastro do mesmo e-mail acabou de criar a conta e já envia o link.
        if (isUniqueViolation(error)) return
        throw error
      }
      if (this.env.DEMO_MODE) {
        this.logger.log(`Cadastro (demonstração): usuário ${userId} criado já confirmado`)
        return
      }
    }

    await this.issueEmailVerification(
      userId,
      input.email,
      { name: input.name, passwordHash },
      input.redirect,
    )
    this.logger.log(`Cadastro: usuário ${userId} aguardando confirmação de e-mail`)
  }

  /** O que o link de confirmação vai ativar, para a tela mostrar antes do clique. */
  async inspectEmailVerification(input: VerifyEmailInput): Promise<EmailVerificationPreview> {
    const [row] = await this.db
      .select({ name: emailVerificationTokens.pendingName, email: users.email })
      .from(emailVerificationTokens)
      .innerJoin(users, eq(users.id, emailVerificationTokens.userId))
      .where(usableVerificationToken(hashToken(input.token)))
    if (!row) throw new BadRequestException(INVALID_LINK)
    return row
  }

  /**
   * Usa o link do e-mail: ativa a conta com as credenciais do cadastro que gerou o link, confirma
   * o e-mail e já abre a sessão.
   */
  async verifyEmail(input: VerifyEmailInput, client: SessionClient): Promise<AuthResult> {
    const tokenHash = hashToken(input.token)

    const userId = await this.db.transaction(async (tx) => {
      // Trava a linha: dois cliques simultâneos no mesmo link não passam os dois.
      const [row] = await tx
        .select({
          id: emailVerificationTokens.id,
          userId: emailVerificationTokens.userId,
          name: emailVerificationTokens.pendingName,
          passwordHash: emailVerificationTokens.pendingPasswordHash,
        })
        .from(emailVerificationTokens)
        .innerJoin(users, eq(users.id, emailVerificationTokens.userId))
        .where(usableVerificationToken(tokenHash))
        .for('update', { of: emailVerificationTokens })
      if (!row) return undefined

      const activated = await this.users.activateWithCredentials(tx, row.userId, {
        name: row.name,
        passwordHash: row.passwordHash,
      })
      if (!activated) return undefined

      // Confirmado: TODOS os links pendentes desta conta morrem (inclusive o de outro cadastro).
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, row.userId))
      await this.sessions.revokeAllUserSessions(tx, row.userId)
      return row.userId
    })
    if (!userId) throw new BadRequestException(INVALID_LINK)

    const user = await this.users.getSessionUser(userId)
    if (!user) throw new BadRequestException(INVALID_LINK)

    const session = await this.sessions.createSession(user.id, client)
    await this.users.recordLogin(user.id)
    this.logger.log(`E-mail confirmado: usuário ${user.id}`)
    return { user, session }
  }

  /**
   * Reenvio do link. Resposta neutra: não revela se a conta existe. Reenvia o cadastro que já está
   * pendente (mesmas credenciais): não existe "reenviar com outra senha".
   */
  async resendEmailVerification(input: ResendVerificationInput): Promise<void> {
    const account = await this.users.findAccountByEmail(input.email)
    if (!account || account.emailVerifiedAt || account.status !== 'active') return
    if (await this.hasRecentVerification(account.id)) return

    const [pending] = await this.db
      .select({
        name: emailVerificationTokens.pendingName,
        passwordHash: emailVerificationTokens.pendingPasswordHash,
      })
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, account.id),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(emailVerificationTokens.createdAt))
      .limit(1)
    // Sem cadastro pendente válido (venceu): a pessoa precisa se cadastrar de novo.
    if (!pending) return

    await this.issueEmailVerification(account.id, input.email, pending)
  }

  async login(input: LoginInput, client: SessionClient): Promise<AuthResult> {
    const credentials = await this.users.findCredentialsByEmail(input.email)
    const passwordOk = await verifyPassword(
      input.password,
      credentials?.passwordHash ?? (await this.dummyHash),
    )
    if (!credentials || !passwordOk) {
      this.logger.warn(`Login recusado (ip ${client.ipAddress ?? '?'})`)
      throw new UnauthorizedException(INVALID_CREDENTIALS)
    }
    // Só quem acertou a senha descobre o motivo do bloqueio.
    if (credentials.status !== 'active') {
      throw new ForbiddenException('Esta conta está suspensa. Fale com o suporte.')
    }
    if (!credentials.emailVerifiedAt) {
      const body: ApiErrorBody = {
        statusCode: 403,
        message: 'Confirme seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.',
        code: EMAIL_NOT_VERIFIED,
      }
      throw new ForbiddenException(body)
    }

    if (needsRehash(credentials.passwordHash)) {
      await this.users.updatePasswordHash(
        this.db,
        credentials.id,
        await hashPassword(input.password),
      )
    }

    const user = await this.users.getSessionUser(credentials.id)
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS)

    const session = await this.sessions.createSession(user.id, client)
    await this.users.recordLogin(user.id)
    this.logger.log(`Login: usuário ${user.id}`)
    return { user, session }
  }

  /**
   * Ambiente de demonstração: entra na conta fixa do papel escolhido, sem senha. Fora do
   * `DEMO_MODE` a rota não existe (404), e só abre sessão se a conta tiver mesmo esse papel.
   */
  async demoLogin(input: DemoLoginInput, client: SessionClient): Promise<AuthResult> {
    if (!this.env.DEMO_MODE) throw new NotFoundException()
    const account = await this.users.findAccountByEmail(DEMO_ACCOUNTS[input.role])
    const user = account ? await this.users.getSessionUser(account.id) : undefined
    if (!user || !user.roles.includes(input.role)) {
      throw new NotFoundException('Conta de demonstração indisponível no momento.')
    }
    const session = await this.sessions.createSession(user.id, client)
    await this.users.recordLogin(user.id)
    this.logger.log(`Login de demonstração (${input.role}): usuário ${user.id}`)
    return { user, session }
  }

  /**
   * Resposta sempre igual para quem chama: não revela se o e-mail existe. O envio não é esperado
   * (senão o tempo de resposta denunciaria contas existentes), e há um intervalo mínimo por conta
   * para ninguém lotar a caixa de e-mail nem derrubar o link legítimo da vítima.
   */
  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const userId = await this.users.findActiveUserIdByEmail(input.email)
    if (!userId) return

    const [recent] = await this.db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.createdAt, new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS)),
        ),
      )
    if (recent) return

    const token = generateToken()
    await this.db.transaction(async (tx) => {
      // Só o link mais recente vale.
      await tx
        .delete(passwordResetTokens)
        .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
      await tx.insert(passwordResetTokens).values({
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      })
    })

    // O token vai no fragmento (#): fragmento não é enviado ao servidor, não aparece em log de
    // acesso nem no cabeçalho Referer.
    const link = new URL('/auth/reset-password', this.env.WEB_ORIGIN)
    link.hash = new URLSearchParams({ token }).toString()
    this.sendMail(
      passwordResetMail({ to: input.email, link: link.toString() }),
      'redefinição de senha',
    )
    this.logger.log(`Redefinição de senha solicitada: usuário ${userId}`)
  }

  /**
   * Troca a senha com um token válido e encerra todas as sessões do usuário. Quem recebe o link
   * no e-mail provou que é dono dele, então a redefinição também confirma o e-mail da conta.
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token)
    const invalidLink = () => new BadRequestException(INVALID_LINK)

    // Confere o token ANTES do argon2 (caro): requisição com token lixo custa uma consulta barata.
    const [candidate] = await this.db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .innerJoin(users, eq(users.id, passwordResetTokens.userId))
      .where(usableResetToken(tokenHash))
    if (!candidate) throw invalidLink()

    const passwordHash = await hashPassword(input.password)

    const userId = await this.db.transaction(async (tx) => {
      // Revalida dentro da transação, travando a linha: dois usos simultâneos do mesmo link
      // não passam os dois.
      const [row] = await tx
        .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
        .from(passwordResetTokens)
        .innerJoin(users, eq(users.id, passwordResetTokens.userId))
        .where(usableResetToken(tokenHash))
        .for('update', { of: passwordResetTokens })
      if (!row) return undefined

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id))
      // Qualquer outro link ainda pendente deste usuário também morre.
      await tx
        .delete(passwordResetTokens)
        .where(and(eq(passwordResetTokens.userId, row.userId), ne(passwordResetTokens.id, row.id)))
      await this.users.updatePasswordHash(tx, row.userId, passwordHash)
      await this.users.markEmailVerified(tx, row.userId)
      await this.sessions.revokeAllUserSessions(tx, row.userId)
      return row.userId
    })

    if (!userId) throw invalidLink()
    this.logger.log(`Senha redefinida: usuário ${userId}`)
  }

  /** Houve um e-mail de confirmação para esta conta há menos de 60 s? */
  private async hasRecentVerification(userId: string): Promise<boolean> {
    const [recent] = await this.db
      .select({ id: emailVerificationTokens.id })
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          isNull(emailVerificationTokens.usedAt),
          gt(
            emailVerificationTokens.createdAt,
            new Date(Date.now() - EMAIL_VERIFICATION_COOLDOWN_MS),
          ),
        ),
      )
    return Boolean(recent)
  }

  /**
   * Cria um link de confirmação ligado às credenciais do cadastro (`pending`) e o envia. Links
   * anteriores NÃO são apagados: cada um continua ativando as credenciais do cadastro que o gerou.
   */
  private async issueEmailVerification(
    userId: string,
    email: string,
    pending: { name: string; passwordHash: string },
    redirect?: string,
  ): Promise<void> {
    const token = generateToken()
    await this.db.transaction(async (tx) => {
      // Só faxina: links vencidos desta conta.
      await tx
        .delete(emailVerificationTokens)
        .where(
          and(
            eq(emailVerificationTokens.userId, userId),
            lt(emailVerificationTokens.expiresAt, new Date()),
          ),
        )
      await tx.insert(emailVerificationTokens).values({
        userId,
        tokenHash: hashToken(token),
        pendingName: pending.name,
        pendingPasswordHash: pending.passwordHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      })
    })

    // Fragmento (#), pelo mesmo motivo do link de redefinição. O destino depois de confirmar
    // também passa pela regra de caminho interno: nunca vira "redirecionar para outro site".
    const params = new URLSearchParams({ token })
    const target = safeInternalPath(redirect, DEFAULT_AFTER_VERIFY)
    if (target !== DEFAULT_AFTER_VERIFY) params.set('redirect', target)
    const link = new URL('/auth/verify-email', this.env.WEB_ORIGIN)
    link.hash = params.toString()

    this.sendMail(
      emailVerificationMail({ to: email, name: pending.name, link: link.toString() }),
      'confirmação de e-mail',
    )
  }

  private accountExistsLinks(email: string) {
    return {
      to: email,
      loginLink: new URL('/login', this.env.WEB_ORIGIN).toString(),
      forgotLink: new URL('/forgot-password', this.env.WEB_ORIGIN).toString(),
    }
  }

  /** Envio fora do caminho da resposta: o tempo não denuncia nada e uma falha de e-mail só vai pro log. */
  private sendMail(message: Parameters<MailService['send']>[0], kind: string) {
    void this.mail
      .send(message)
      .catch((error: unknown) =>
        this.logger.error(`Falha ao enviar e-mail (${kind}): ${String(error)}`),
      )
  }
}

/** Token existe, não foi usado, não venceu e o dono está ativo. */
function usableResetToken(tokenHash: string) {
  return and(
    eq(passwordResetTokens.tokenHash, tokenHash),
    isNull(passwordResetTokens.usedAt),
    gt(passwordResetTokens.expiresAt, new Date()),
    eq(users.status, 'active'),
  )
}

/** Link de confirmação existe, não foi usado, não venceu e a conta está ativa. */
function usableVerificationToken(tokenHash: string) {
  return and(
    eq(emailVerificationTokens.tokenHash, tokenHash),
    isNull(emailVerificationTokens.usedAt),
    gt(emailVerificationTokens.expiresAt, new Date()),
    eq(users.status, 'active'),
  )
}
