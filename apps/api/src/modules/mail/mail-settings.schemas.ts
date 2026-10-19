import { z } from 'zod'

/**
 * Servidor de e-mail cadastrado no painel. A senha só vem quando muda: ausente (ou em branco) mantém a
 * salva. Usuário em branco = servidor sem autenticação (a senha salva é apagada).
 */
export const mailSettingsInputSchema = z.object({
  host: z
    .string()
    .trim()
    .min(1, 'Informe o servidor SMTP')
    .max(253, 'Servidor longo demais')
    .regex(/^[A-Za-z0-9.-]+$/, 'Informe só o endereço do servidor, ex.: smtp.resend.com'),
  port: z.coerce.number().int().min(1, 'Porta inválida').max(65535, 'Porta inválida'),
  secure: z.boolean(),
  user: z.string().trim().max(254, 'Usuário longo demais').optional(),
  password: z.string().max(500, 'Senha longa demais').optional(),
  fromName: z
    .string()
    .trim()
    .min(1, 'Informe o nome do remetente')
    .max(100, 'Nome do remetente longo demais')
    .regex(/^[^\r\n<>"]+$/, 'O nome do remetente não pode ter aspas, < > nem quebra de linha'),
  fromEmail: z.email('E-mail do remetente inválido').max(254),
})
export type MailSettingsInput = z.infer<typeof mailSettingsInputSchema>
