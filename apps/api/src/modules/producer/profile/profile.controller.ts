import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Put,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentSessionId, CurrentUser, Roles } from '../../auth/decorators.js'
import { SESSION_THROTTLER } from '../../auth/throttling.js'
import {
  changePasswordSchema,
  updateAvatarSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateAvatarInput,
  type UpdateProfileInput,
} from './profile.schemas.js'
import { ProfileService } from './profile.service.js'

/** Perfil do produtor logado. O id é sempre o da sessão. */
@Controller('producer/profile')
@Roles(['producer'])
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUser() user: SessionUser) {
    return this.profile.getProfile(user.id)
  }

  @Patch()
  update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.profile.updateProfile(user.id, body)
  }

  @Put('avatar')
  updateAvatar(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAvatarSchema)) body: UpdateAvatarInput,
  ) {
    return this.profile.updateAvatar(user.id, body)
  }

  /** Limite apertado POR SESSÃO: quem roubou um cookie não consegue adivinhar a senha atual. */
  @Post('password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 5, ttl: 60_000 },
    [SESSION_THROTTLER]: { limit: 5, ttl: 60_000 },
  })
  changePassword(
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    return this.profile.changePassword(user.id, sessionId, body)
  }
}
