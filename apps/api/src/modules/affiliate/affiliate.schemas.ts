import { emailSchema } from '@vox/contracts'
import { z } from 'zod'

const AFFILIATE_PROMOTION_CHANNELS = [
  'instagram',
  'youtube',
  'whatsapp',
  'telegram',
  'blog',
  'website',
  'email',
  'community',
] as const

/** Só http/https: o admin abre este endereço na tela de revisão (nada de `javascript:`). */
const httpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, 'Informe uma URL válida')

/** Texto opcional: vazio vira `undefined`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined))

/** Candidatura ao programa de afiliados. */
export const submitApplicationSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo').max(200),
  email: emailSchema,
  phone: z.string().trim().min(10, 'Informe um telefone válido').max(40),
  instagramHandle: optionalText(120),
  youtubeChannel: optionalText(255),
  websiteUrl: z.union([z.literal('').transform(() => undefined), httpUrlSchema]).optional(),
  audienceSize: optionalText(120),
  audienceSummary: z.string().trim().min(30, 'Descreva sua audiência com mais detalhes').max(2000),
  promotionChannels: z
    .array(z.enum(AFFILIATE_PROMOTION_CHANNELS))
    .min(1, 'Selecione pelo menos um canal de divulgação')
    .max(AFFILIATE_PROMOTION_CHANNELS.length)
    .transform((channels) => [...new Set(channels)]),
  experienceSummary: z
    .string()
    .trim()
    .min(30, 'Conte um pouco mais sobre sua experiência com divulgação')
    .max(2000),
  whyAffiliate: z
    .string()
    .trim()
    .min(30, 'Explique por que você quer entrar no programa de afiliados')
    .max(2000),
})
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>

/** Caminho interno de destino do link: só caminho (sem `?`, `#`, `//` nem espaços). */
const destinationPathSchema = z
  .string()
  .trim()
  .max(160)
  .regex(/^\/?(?!\/)[A-Za-z0-9\-._~%/]*$/, 'Caminho de destino inválido')
  .optional()
  .transform((value) => (value ? value : undefined))

export const upsertLinkSchema = z.object({
  partnershipId: z.coerce.number().int().positive('Parceria inválida'),
  campaignName: optionalText(80),
  trafficSource: optionalText(80),
  destinationPath: destinationPathSchema,
  notes: optionalText(500),
  isActive: z.boolean().default(true),
})
export type UpsertLinkInput = z.infer<typeof upsertLinkSchema>

export const toggleLinkSchema = z.object({ isActive: z.boolean() })
export type ToggleLinkInput = z.infer<typeof toggleLinkSchema>

export const idParamSchema = z.coerce
  .number()
  .int()
  .positive('Identificador inválido')
  .max(2_147_483_647)

export const financialsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  type: z.enum(['all', 'sale', 'withdrawal', 'refund', 'commission']).default('all'),
})
export type FinancialsQuery = z.infer<typeof financialsQuerySchema>

const WITHDRAWAL_MIN_REAIS = 50
const WITHDRAWAL_MAX_REAIS = 1_000_000

const bankText = z.string().trim().max(120).optional()

/** Pedido de saque. `amount` em reais (como o formulário envia); o service converte para centavos. */
export const requestWithdrawalSchema = z
  .object({
    amount: z
      .number({ error: 'Informe o valor do saque' })
      .finite()
      .min(WITHDRAWAL_MIN_REAIS, 'Valor mínimo de saque é R$ 50,00')
      .max(WITHDRAWAL_MAX_REAIS, 'Valor de saque acima do permitido')
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
        message: 'O valor deve ter no máximo 2 casas decimais',
      }),
    method: z.enum(['pix', 'bank_transfer']),
    pix_key: bankText,
    bank_code: bankText,
    bank_agency: bankText,
    bank_account: bankText,
    account_type: z.enum(['checking', 'savings']).optional(),
  })
  .superRefine((data, ctx) => {
    const need = (field: keyof typeof data, message: string) => {
      if (!data[field]) ctx.addIssue({ code: 'custom', path: [field], message })
    }
    if (data.method === 'pix') {
      need('pix_key', 'Chave PIX é obrigatória para saque via PIX')
    } else {
      need('bank_code', 'Banco é obrigatório para transferência bancária')
      need('bank_agency', 'Agência é obrigatória para transferência bancária')
      need('bank_account', 'Conta é obrigatória para transferência bancária')
      need('account_type', 'Tipo de conta é obrigatório para transferência bancária')
    }
  })
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>

/** Chave de rastreio (cookie): UUID gerado pelo proxy do front. Nada de texto livre. */
const trackingKeySchema = z.string().regex(/^[A-Za-z0-9-]{8,64}$/, 'Chave de rastreio inválida')

/** Clique em link de afiliado, vindo do proxy do front. O código é validado no service. */
export const registerClickSchema = z.object({
  code: z.string().max(200),
  sessionKey: trackingKeySchema,
  visitorKey: trackingKeySchema.nullish(),
  path: z.string().max(500).default(''),
  search: z.string().max(1000).default(''),
  referrer: z.string().max(1000).nullish(),
  userAgent: z.string().max(500).nullish(),
})
export type RegisterClickInput = z.infer<typeof registerClickSchema>
