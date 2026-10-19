import { Module } from '@nestjs/common'
import { AdminSettingsController, PublicSettingsController } from './settings.controller.js'
import { SettingsService } from './settings.service.js'

/** Configurações da plataforma (`platform_settings`): leitura pública + edição pelo admin. */
@Module({
  controllers: [PublicSettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
