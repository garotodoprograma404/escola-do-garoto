import { Injectable, Logger } from '@nestjs/common'
import { MailService, type MailMessage } from './mail.service.js'

/** Desenvolvimento e testes: escreve o e-mail no log em vez de enviar. Bloqueado em produção. */
@Injectable()
export class ConsoleMailService extends MailService {
  private readonly logger = new Logger('Mail')

  async send(message: MailMessage) {
    this.logger.log(`Para: ${message.to} | Assunto: ${message.subject}\n${message.text}`)
  }
}
