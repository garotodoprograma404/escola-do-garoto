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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentSessionId, CurrentUser } from '../auth/decorators.js'
import { SESSION_THROTTLER } from '../auth/throttling.js'
import { StudentCoursesService } from './student-courses.service.js'
import { StudentProfileService } from './student-profile.service.js'
import {
  changePasswordSchema,
  notificationPreferencesSchema,
  updateAvatarSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type NotificationPreferencesInput,
  type UpdateAvatarInput,
  type UpdateProfileInput,
} from './student.schemas.js'

/**
 * Área do aluno: painel, "meus cursos" e perfil. Tudo do usuário da sessão; nenhuma rota recebe
 * id de usuário. Qualquer pessoa logada tem painel (quem só vende curso também pode comprar).
 */
@Controller('student')
export class StudentController {
  constructor(
    @Inject(StudentCoursesService) private readonly courses: StudentCoursesService,
    @Inject(StudentProfileService) private readonly profile: StudentProfileService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: SessionUser) {
    return this.courses.getDashboard(user.id)
  }

  @Get('courses')
  myCourses(@CurrentUser() user: SessionUser) {
    return this.courses.getMyCourses(user.id)
  }

  @Get('profile')
  getProfile(@CurrentUser() user: SessionUser) {
    return this.profile.getProfile(user.id)
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.profile.updateProfile(user.id, body)
  }

  @Put('profile/avatar')
  updateAvatar(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateAvatarSchema)) body: UpdateAvatarInput,
  ) {
    return this.profile.updateAvatar(user.id, body)
  }

  @Get('profile/notification-preferences')
  getNotificationPreferences(@CurrentUser() user: SessionUser) {
    return this.profile.getNotificationPreferences(user.id)
  }

  @Put('profile/notification-preferences')
  updateNotificationPreferences(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(notificationPreferencesSchema)) body: NotificationPreferencesInput,
  ) {
    return this.profile.updateNotificationPreferences(user.id, body)
  }

  @Get('profile/activity')
  activity(@CurrentUser() user: SessionUser) {
    return this.profile.getActivity(user.id)
  }

  /** Confere a senha atual: limite apertado por IP e POR SESSÃO (cookie roubado não adivinha). */
  @Throttle({ default: { limit: 5, ttl: 60_000 }, [SESSION_THROTTLER]: { limit: 5, ttl: 60_000 } })
  @Post('profile/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: SessionUser,
    @CurrentSessionId() sessionId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    return this.profile.changePassword(user.id, sessionId, body)
  }
}
