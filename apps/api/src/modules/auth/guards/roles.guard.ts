import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { Roles } from '../decorators.js'

/** Guard global: aplica `@Roles([...])`. Roda depois do SessionGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true
    // `@Roles([])` é erro de programação: negar é mais seguro que liberar para qualquer logado.
    if (required.length === 0) throw new ForbiddenException('Rota sem papel permitido')

    const user = context.switchToHttp().getRequest<Request>().auth?.user
    if (!user) throw new UnauthorizedException('Faça login para continuar')

    const allowed = required.some((role) => user.roles.includes(role))
    if (!allowed) throw new ForbiddenException('Você não tem permissão para esta ação')
    return true
  }
}
