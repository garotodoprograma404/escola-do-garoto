import type { MailMessage } from '../../mail/mail.service.js'

export function passwordResetMail(params: { to: string; link: string }): MailMessage {
  return {
    to: params.to,
    subject: 'Redefinição de senha: Escola do Garoto;',
    text: [
      'Recebemos um pedido para redefinir a senha da sua conta.',
      '',
      `Para criar uma nova senha, acesse (válido por 1 hora): ${params.link}`,
      '',
      'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
    ].join('\n'),
  }
}
