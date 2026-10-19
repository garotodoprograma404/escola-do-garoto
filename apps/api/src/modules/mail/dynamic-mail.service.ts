import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConsoleMailService } from './console-mail.service.js'
import { MailNotConfiguredError, MailSettingsService } from './mail-settings.service.js'
import { MailService, type MailMessage } from './mail.service.js'
import { SmtpMailService, type SmtpConfig } from './smtp-mail.service.js'

/**
 * E-mail escolhido a cada envio, pelo que o admin cadastrou no painel (nada no `.env`):
 *
 * - `DEMO_MODE`: sempre no log (a demonstração não manda e-mail de verdade);
 * - servidor salvo no painel: SMTP;
 * - sem servidor, fora de produção: no log (desenvolvimento);
 * - sem servidor em produção: não envia e avisa no log (o painel mostra o aviso para o admin).
 */
@Injectable()
export class DynamicMailService extends MailService {
  private readonly logger = new Logger('Mail')
  private readonly console = new ConsoleMailService()
  private smtp: { config: SmtpConfig; service: SmtpMailService } | undefined

  constructor(@Inject(MailSettingsService) private readonly settings: MailSettingsService) {
    super()
  }

  async send(message: MailMessage): Promise<void> {
    const mode = await this.settings.mode()
    if (mode === 'console') return this.console.send(message)
    if (mode === 'disabled') {
      this.logger.warn(
        `E-mail "${message.subject}" não enviado: cadastre o servidor em Configurações → E-mail`,
      )
      throw new MailNotConfiguredError()
    }
    const config = (await this.settings.getSmtp())!
    // Reaproveita a conexão enquanto a configuração não muda.
    if (!this.smtp || JSON.stringify(this.smtp.config) !== JSON.stringify(config)) {
      this.smtp = { config, service: new SmtpMailService(config) }
    }
    return this.smtp.service.send(message)
  }
}
