import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SESSION_COOKIE_NAME } from '@vox/contracts'
import type { Request, Response } from 'express'
import { ENV } from '../../../config/config.module.js'
import type { Env } from '../../../config/env.js'
import { Public } from '../decorators.js'
import { clearSessionCookie } from '../session-cookie.js'
import { SessionsService } from '../sessions.service.js'

/**
 * Guard global: toda rota exige sessão válida, exceto as marcadas com `@Public()`.
 * Segurança por padrão: esquecer o decorator fecha a rota, nunca abre.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Só HTTP é protegido por cookie. WebSocket/RPC, quando existirem, precisam do próprio guard:
    // negar aqui evita que um canal novo nasça aberto por esquecimento.
    if (context.getType() !== 'http') return false

    const isPublic = this.reflector.getAllAndOverride(Public, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const http = context.switchToHttp()
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()

    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME]
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Faça login para continuar')
    }

    const session = await this.sessions.validateSession(token)
    if (!session) {
      clearSessionCookie(res, this.env.COOKIE_SECURE)
      throw new UnauthorizedException('Sua sessão expirou. Faça login novamente')
    }

    req.auth = { user: session.user, sessionId: session.sessionId }
    return true
  }
}
