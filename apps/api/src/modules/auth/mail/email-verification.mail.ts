import type { MailMessage } from '../../mail/mail.service.js'

export function emailVerificationMail(params: {
  to: string
  name: string
  link: string
}): MailMessage {
  return {
    to: params.to,
    subject: 'Confirme seu e-mail: Escola do Garoto;',
    text: [
      `Olá, ${params.name.split(' ')[0]}!`,
      '',
      `Para ativar sua conta, confirme seu e-mail (o link vale por 24 horas): ${params.link}`,
      '',
      `Cadastro feito em nome de: ${params.name}`,
      '',
      'Se não foi você que criou a conta, ignore este e-mail: nada será ativado.',
    ].join('\n'),
  }
}

/** Alguém tentou cadastrar um e-mail que já tem conta: avisa o dono em vez de revelar isso na tela. */
export function accountExistsMail(params: {
  to: string
  loginLink: string
  forgotLink: string
}): MailMessage {
  return {
    to: params.to,
    subject: 'Você já tem conta: Escola do Garoto;',
    text: [
      'Alguém tentou criar uma conta com este e-mail, mas ele já está cadastrado.',
      '',
      `Para entrar: ${params.loginLink}`,
      `Esqueceu a senha? ${params.forgotLink}`,
      '',
      'Se não foi você, pode ignorar este e-mail. Sua conta continua segura.',
    ].join('\n'),
  }
}
