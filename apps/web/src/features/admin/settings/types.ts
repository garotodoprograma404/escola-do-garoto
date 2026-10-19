// Platform settings types

export interface GeneralSettings {
  platformName: string
  platformDescription: string
  supportEmail: string
  supportPhone: string
  timezone: string
  language: string
  currency: string
  maintenanceMode: boolean
}

interface BrandingSettings {
  logoUrl: string
  faviconUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
}

interface EmailSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  replyToEmail: string
}

export interface FinancialSettings {
  paymentGateway: 'mercadopago'
  pixEnabled: boolean
  creditCardEnabled: boolean
  boletoEnabled: boolean
  maxInstallments: number
  defaultInstallments: number
}

interface IntegrationSettings {
  googleAnalyticsId: string
  facebookPixelId: string
  hotjarId: string
  intercomId: string
  zendeskEnabled: boolean
  mailchimpApiKey: string
}

export interface LegalSettings {
  termsOfServiceUrl: string
  privacyPolicyUrl: string
  refundPolicyUrl: string
  cookiePolicyUrl: string
  companyName: string
  companyDocument: string
  companyAddress: string
}

interface SeoSettings {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  ogImage: string
  twitterCard: 'summary' | 'summary_large_image'
  robotsTxt: string
  sitemapEnabled: boolean
}

export interface PlatformSettings {
  general: GeneralSettings
  branding: BrandingSettings
  email: EmailSettings
  financial: FinancialSettings
  integrations: IntegrationSettings
  legal: LegalSettings
  seo: SeoSettings
}

export type SettingsSection = 'general' | 'branding' | 'financial' | 'email' | 'legal'

/** Situação do Mercado Pago no painel (`GET /api/admin/payment-gateway`). Nunca traz o segredo. */
export interface PaymentGatewayView {
  provider: 'mercadopago'
  configured: boolean
  live: boolean | null
  tokenHint: string | null
  webhookSecretConfigured: boolean
  accountLabel: string | null
  verifiedAt: string | null
  updatedAt: string | null
  webhookUrl: string
  demoMode: boolean
}

/** Servidor de e-mail como o painel vê: nunca a senha, só se ela está salva. */
export interface MailSettingsView {
  configured: boolean
  host: string | null
  port: number | null
  secure: boolean | null
  user: string | null
  passwordConfigured: boolean
  fromName: string | null
  fromEmail: string | null
  verifiedAt: string | null
  updatedAt: string | null
  /** A senha salva não abre mais (a chave do servidor mudou): precisa cadastrar de novo. */
  passwordUnreadable: boolean
  mode: 'smtp' | 'console' | 'disabled'
  demoMode: boolean
}
