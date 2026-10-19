import { z } from 'zod'

const accessToken = z
  .string()
  .trim()
  .max(300, 'Access Token longo demais')
  .regex(
    /^(APP_USR|TEST)-[\w-]{20,}$/,
    'Access Token inválido: ele começa com APP_USR- (produção) ou TEST- (teste)',
  )

const webhookSecret = z
  .string()
  .trim()
  .min(16, 'Assinatura secreta curta demais: copie a chave inteira do painel do Mercado Pago')
  .max(200, 'Assinatura secreta longa demais')

/** Salvar credenciais: campo ausente mantém o que já estava (dá para trocar só a assinatura). */
export const paymentGatewayInputSchema = z
  .object({ accessToken: accessToken.optional(), webhookSecret: webhookSecret.optional() })
  .refine((value) => value.accessToken !== undefined || value.webhookSecret !== undefined, {
    message: 'Informe o Access Token ou a assinatura secreta do webhook',
  })
export type PaymentGatewayInput = z.infer<typeof paymentGatewayInputSchema>
