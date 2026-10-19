import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { mailSettingsInputSchema, type MailSettingsInput } from './mail-settings.schemas.js'
import { MailSettingsService } from './mail-settings.service.js'

/**
 * Servidor de e-mail no painel do admin. A senha entra aqui e nunca sai: as respostas trazem só o
 * servidor, o usuário, o remetente e se há senha salva.
 */
@Roles(['admin'])
@Controller('admin/mail-settings')
export class AdminMailSettingsController {
  constructor(@Inject(MailSettingsService) private readonly settings: MailSettingsService) {}

  @Get()
  view() {
    return this.settings.getAdminView()
  }

  /** Cada gravação conecta no servidor: limite curto para não virar tentativa de senha. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Put()
  save(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(mailSettingsInputSchema)) body: MailSettingsInput,
    @Req() req: Request,
  ) {
    return this.settings.save(user.id, body, requestInfo(req))
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('check')
  @HttpCode(HttpStatus.OK)
  check() {
    return this.settings.check()
  }

  /** E-mail de teste para o próprio admin logado. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('test')
  @HttpCode(HttpStatus.OK)
  sendTest(@CurrentUser() user: SessionUser) {
    return this.settings.sendTest(user.email)
  }

  @Delete()
  remove(@CurrentUser() user: SessionUser, @Req() req: Request) {
    return this.settings.remove(user.id, requestInfo(req))
  }
}
