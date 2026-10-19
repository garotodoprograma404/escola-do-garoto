import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { auditContext } from './audit-context.js'
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
} from './admin-users.schemas.js'
import {
  AdminUsersService,
  type AdminUserDetails,
  type AdminUserListItem,
} from './admin-users.service.js'

/** Gestão de usuários. Tudo exige papel de admin e a autorização NUNCA depende do front. */
@Controller('admin/users')
@Roles(['admin'])
export class AdminUsersController {
  constructor(@Inject(AdminUsersService) private readonly service: AdminUsersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<{ users: AdminUserListItem[]; total: number }> {
    return this.service.list(query)
  }

  @Get(':id')
  get(
    @Param('id', new ZodValidationPipe(userIdParamSchema)) id: string,
  ): Promise<AdminUserListItem> {
    return this.service.get(id)
  }

  @Get(':id/details')
  details(
    @Param('id', new ZodValidationPipe(userIdParamSchema)) id: string,
  ): Promise<AdminUserDetails> {
    return this.service.getDetails(id)
  }

  /** Gasta CPU (argon2): limite por sessão. */
  @Post()
  @Throttle({ session: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentUser() actor: SessionUser,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @Req() req: Request,
  ): Promise<{ userId: string }> {
    return this.service.create(actor, body, auditContext(req))
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() actor: SessionUser,
    @Param('id', new ZodValidationPipe(userIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.update(actor, id, body, auditContext(req))
  }

  /** "Excluir" = desativar (conta suspensa, papéis revogados, sessões encerradas). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @CurrentUser() actor: SessionUser,
    @Param('id', new ZodValidationPipe(userIdParamSchema)) id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.deactivate(actor, id, auditContext(req))
  }
}
