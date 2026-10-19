export type MailMessage = {
  to: string
  subject: string
  text: string
}

/**
 * Porta de envio de e-mail. Quem envia depende só desta classe abstrata;
 * o provedor real (Resend, SES…) entra como outra implementação, sem mexer nos módulos.
 */
export abstract class MailService {
  abstract send(message: MailMessage): Promise<void>
}
