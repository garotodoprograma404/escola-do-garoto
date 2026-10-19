import { Body, Controller, Get, Inject, NotFoundException, Param, Put, Req } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public, Roles } from '../auth/decorators.js'
import { clientIp } from '../auth/throttling.js'
import {
  SETTINGS_GROUPS,
  SETTINGS_INPUT_SCHEMAS,
  type SettingsByGroup,
  type SettingsGroup,
} from './settings.registry.js'
import { SettingsService } from './settings.service.js'

function parseGroup(value: string): SettingsGroup {
  if (!(SETTINGS_GROUPS as readonly string[]).includes(value)) {
    throw new NotFoundException('Grupo de configurações não encontrado')
  }
  return value as SettingsGroup
}

/**
 * Leitura PÚBLICA das configurações (nome, logo, cores, textos legais, métodos de pagamento).
 * Devolve só o que está marcado como `is_public`. Quase toda página do site chama isto.
 */
@Controller('public/settings')
export class PublicSettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  /** Todos os grupos de uma vez: `{ general, branding, financial, legal }`. */
  @Public()
  @Get()
  getAll(): Promise<SettingsByGroup> {
    return this.settings.getPublicSettings()
  }

  @Public()
  @Get(':group')
  getGroup(@Param('group') group: string) {
    return this.settings.getPublicGroup(parseGroup(group))
  }
}

@Controller('admin/settings')
@Roles(['admin'])
export class AdminSettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get(':group')
  getGroup(@Param('group') group: string) {
    return this.settings.getGroupForAdmin(parseGroup(group))
  }

  /** Branding aceita só os campos enviados; os outros grupos exigem o objeto completo. */
  @Put(':group')
  saveGroup(
    @Param('group') group: string,
    @Body() body: unknown,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    const name = parseGroup(group)
    const input = new ZodValidationPipe(SETTINGS_INPUT_SCHEMAS[name]).transform(body)
    return this.settings.saveGroup(name, input as Partial<SettingsByGroup[typeof name]>, user.id, {
      ipAddress: clientIp(req),
      userAgent: req.get('user-agent'),
    })
  }
}
