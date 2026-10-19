import {
  createParamDecorator,
  InternalServerErrorException,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role, SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import type { AuthContext } from './auth-context.js'

/** Libera a rota sem login. Toda rota sem isto exige sessão válida. */
export const Public = Reflector.createDecorator<void, true>({ transform: () => true })

/**
 * Restringe a rota a quem tem pelo menos um dos papéis: `@Roles(['admin'])`.
 */
export const Roles = Reflector.createDecorator<Role[]>()

function getAuth(ctx: ExecutionContext): AuthContext {
  const auth = ctx.switchToHttp().getRequest<Request>().auth
  // Só acontece se alguém usar o decorator numa rota @Public(): erro de programação.
  if (!auth) throw new InternalServerErrorException('Rota sem sessão usando dados do usuário')
  return auth
}

/** Usuário da sessão atual. Nunca use id de usuário vindo do body/query para "o próprio usuário". */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser => getAuth(ctx).user,
)

export const CurrentSessionId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => getAuth(ctx).sessionId,
)
