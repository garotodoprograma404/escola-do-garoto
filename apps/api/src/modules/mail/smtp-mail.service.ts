import { Injectable } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'
import { MailService, type MailMessage } from './mail.service.js'

export type SmtpConfig = {
  host: string
  port: number
  /** `true` = TLS direto (porta 465). `false` = STARTTLS quando o servidor oferece (porta 587). */
  secure: boolean
  user?: string
  password?: string
  /** Exige STARTTLS quando não é TLS direto (padrão). */
  requireTls: boolean
  /** Remetente: `Nome <contato@dominio.com.br>`. */
  from: string
}

/** Envio real por SMTP (Resend, SES, Brevo, Gmail…). Só texto: é o que os e-mails do sistema usam. */
@Injectable()
export class SmtpMailService extends MailService {
  private readonly transport: Transporter

  constructor(
    private readonly config: SmtpConfig,
    transport?: Transporter,
  ) {
    super()
    this.transport =
      transport ??
      createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: !config.secure && config.requireTls,
        auth: config.user ? { user: config.user, pass: config.password } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
  }

  async send(message: MailMessage) {
    await this.transport.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
  }
}
