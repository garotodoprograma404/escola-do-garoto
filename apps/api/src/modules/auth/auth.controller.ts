import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  registerInputSchema,
  resendVerificationInputSchema,
  verifyEmailInputSchema,
  resetPasswordInputSchema,
  type AuthResponse,
  type ForgotPasswordInput,
  type EmailVerificationPreview,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  SESSION_COOKIE_NAME,
  type SessionUser,
  type VerifyEmailInput,
} from '@vox/contracts'
import type { Request, Response } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { RATE_LIMITS } from './auth.constants.js'
import { demoLoginSchema, type DemoLoginInput } from './demo-accounts.js'
import { AuthService } from './auth.service.js'
import { CurrentSessionId, CurrentUser, Public } from './decorators.js'
import { clearSessionCookie, setSessionCookie } from './session-cookie.js'
import { clientIp } from './throttling.js'
import { SessionsService, type SessionClient } from './sessions.service.js'

function clientOf(req: Request): SessionClient {
  return { userAgent: req.get('user-agent'), ipAddress: clientIp(req) }
}

@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(ENV) env: Env,
  ) {
    this.secureCookies = env.COOKIE_SECURE
  }

  /** Neutro de propósito: a resposta é a mesma para e-mail novo, pendente ou já cadastrado. */
  @Public()
  @Throttle(RATE_LIMITS.register)
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  async register(
    @Body(new ZodValidationPipe(registerInputSchema)) body: RegisterInput,
  ): Promise<MessageResponse> {
    await this.auth.register(body)
    return { message: 'Enviamos um link de confirmação para o seu e-mail. Ele vale por 24 horas.' }
  }

  /** Mostra para quem é o link antes do clique (a pessoa vê em nome de quem está confirmando). */
  @Public()
  @Throttle(RATE_LIMITS.verifyEmail)
  @Post('email/inspect')
  @HttpCode(HttpStatus.OK)
  inspectEmail(
    @Body(new ZodValidationPipe(verifyEmailInputSchema)) body: VerifyEmailInput,
  ): Promise<EmailVerificationPreview> {
    return this.auth.inspectEmailVerification(body)
  }

  /** O link do e-mail cai aqui: confirma o e-mail e já entra. */
  @Public()
  @Throttle(RATE_LIMITS.verifyEmail)
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailInputSchema)) body: VerifyEmailInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    await this.dropPreviousSession(req)
    const { user, session } = await this.auth.verifyEmail(body, clientOf(req))
    setSessionCookie(res, session.token, session.expiresAt, this.secureCookies)
    return { user }
  }

  @Public()
  @Throttle(RATE_LIMITS.resendVerification)
  @Post('email/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationInputSchema)) body: ResendVerificationInput,
  ): Promise<MessageResponse> {
    await this.auth.resendEmailVerification(body)
    return {
      message: 'Se houver uma conta aguardando confirmação, enviaremos um novo link para o e-mail.',
    }
  }

  @Public()
  @Throttle(RATE_LIMITS.login)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    await this.dropPreviousSession(req)
    const { user, session } = await this.auth.login(body, clientOf(req))
    setSessionCookie(res, session.token, session.expiresAt, this.secureCookies)
    return { user }
  }

  /** Botões "entrar como aluno/produtor/admin" do ambiente de demonstração (404 fora dele). */
  @Public()
  @Throttle(RATE_LIMITS.login)
  @Post('demo-login')
  @HttpCode(HttpStatus.OK)
  async demoLogin(
    @Body(new ZodValidationPipe(demoLoginSchema)) body: DemoLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    await this.dropPreviousSession(req)
    const { user, session } = await this.auth.demoLogin(body, clientOf(req))
    setSessionCookie(res, session.token, session.expiresAt, this.secureCookies)
    return { user }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentSessionId() sessionId: string, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revokeSession(sessionId)
    clearSessionCookie(res, this.secureCookies)
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): AuthResponse {
    return { user }
  }

  @Public()
  @Throttle(RATE_LIMITS.forgotPassword)
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordInputSchema)) body: ForgotPasswordInput,
  ) {
    await this.auth.requestPasswordReset(body)
    return { message: 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.' }
  }

  @Public()
  @Throttle(RATE_LIMITS.resetPassword)
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordInputSchema)) body: ResetPasswordInput,
  ) {
    await this.auth.resetPassword(body)
  }

  /** Entrar de novo invalida o cookie antigo deste navegador (nada de sessão esquecida viva). */
  private async dropPreviousSession(req: Request) {
    const previous: unknown = req.cookies?.[SESSION_COOKIE_NAME]
    if (typeof previous === 'string' && previous.length > 0) {
      await this.sessions.revokeSessionByToken(previous)
    }
  }
}
