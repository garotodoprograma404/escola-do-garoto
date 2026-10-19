import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Put,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentSessionId, CurrentUser, Roles } from '../auth/decorators.js'
import { auditContext } from './audit-context.js'
import { AdminProfileService, type AdminProfileDto } from './admin-profile.service.js'
import {
  changePasswordSchema,
  ownAvatarUrlSchema,
  updateAdminProfileSchema,
  type ChangePasswordInput,
  type UpdateAdminProfileInput,
} from './admin-users.schemas.js'

/** Perfil do próprio admin: nome, foto e senha. Nenhuma rota recebe o id de alguém. */
@Controller('admin/profile')
@Roles(['admin'])
export class AdminProfileController {
  constructor(@Inject(AdminProfileService) private readonly profile: AdminProfileService) {}

  @Get()
  get(@CurrentUser() user: SessionUser): Promise<AdminProfileDto> {
    return this.profile.get(user)
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAdminProfileSchema)) body: UpdateAdminProfileInput,
  ): Promise<void> {
    await this.profile.update(user, body)
  }

  @Put('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateAvatar(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<void> {
    // O avatar precisa ser um arquivo enviado PELA PRÓPRIA pessoa: o schema depende do id dela.
    const parsed = new ZodValidationPipe(ownAvatarUrlSchema(user.id)).transform(body)
    await this.profile.updateAvatar(user, parsed.avatar_url)
  }

  /** Confere a senha atual (argon2): poucas tentativas por minuto, por IP e por sessão. */
  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 }, session: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: Request,
  ): Promise<void> {
    await this.profile.changePassword(user, sessionId, body, auditContext(req))
  }
}
