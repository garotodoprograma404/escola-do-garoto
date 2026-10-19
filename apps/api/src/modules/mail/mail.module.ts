import { Global, Module } from '@nestjs/common'
import { AdminMailSettingsController } from './admin-mail-settings.controller.js'
import { DynamicMailService } from './dynamic-mail.service.js'
import { MailSettingsService } from './mail-settings.service.js'
import { MailService } from './mail.service.js'

/**
 * E-mail: o resto do sistema só conhece a porta `MailService`; quem decide como envia é o
 * `DynamicMailService`, pelo servidor que o admin cadastrou no painel.
 */
@Global()
@Module({
  controllers: [AdminMailSettingsController],
  providers: [
    MailSettingsService,
    DynamicMailService,
    { provide: MailService, useExisting: DynamicMailService },
  ],
  exports: [MailService, MailSettingsService],
})
export class MailModule {}
