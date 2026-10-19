import { z } from 'zod'

export const AFFILIATE_PROMOTION_CHANNEL_OPTIONS = [
  'instagram',
  'youtube',
  'whatsapp',
  'telegram',
  'blog',
  'website',
  'email',
  'community',
] as const

export const affiliateApplicationSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo'),
  email: z.string().trim().email('Informe um e-mail valido'),
  phone: z.string().trim().min(10, 'Informe um telefone valido'),
  instagramHandle: z.string().trim().max(120).optional().or(z.literal('')),
  youtubeChannel: z.string().trim().max(255).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Informe uma URL valida').optional().or(z.literal('')),
  audienceSize: z.string().trim().max(120).optional().or(z.literal('')),
  audienceSummary: z.string().trim().min(30, 'Descreva sua audiência com mais detalhes'),
  promotionChannels: z
    .array(z.enum(AFFILIATE_PROMOTION_CHANNEL_OPTIONS))
    .min(1, 'Selecione pelo menos um canal de divulgação'),
  experienceSummary: z
    .string()
    .trim()
    .min(30, 'Conte um pouco mais sobre sua experiência com divulgação'),
  whyAffiliate: z
    .string()
    .trim()
    .min(30, 'Explique por que você quer entrar no programa de afiliados'),
})

export type AffiliatePromotionChannel = (typeof AFFILIATE_PROMOTION_CHANNEL_OPTIONS)[number]
