import { z } from 'zod'
import { isSafeUrl } from '../../common/safe-url.js'

/**
 * Catálogo das configurações da plataforma (tabela `platform_settings`, uma linha por chave).
 *
 * O servidor é o dono deste catálogo: a chave, a visibilidade (`is_public`) e a descrição de cada
 * campo vêm DAQUI, nunca do cliente. Aceitar qualquer chave `branding_*` e deixar o
 * cliente decidir o `is_public` exporia ou alteraria configuração indevida: só campos conhecidos
 * são gravados.
 */

export const SETTINGS_GROUPS = ['general', 'branding', 'financial', 'legal'] as const
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number]

type FieldDef = { key: string; description: string; isPublic: boolean }

// ---------------------------------------------------------------------------------------------
// Valores padrão
// ---------------------------------------------------------------------------------------------

type GeneralSettings = {
  platformName: string
  platformDescription: string
  supportEmail: string
  supportPhone: string
  timezone: string
  language: string
  currency: string
  maintenanceMode: boolean
}

type BrandingSettings = {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  fontFamily: string
}

type FinancialSettings = {
  paymentGateway: 'mercadopago'
  pixEnabled: boolean
  creditCardEnabled: boolean
  boletoEnabled: boolean
  maxInstallments: number
  defaultInstallments: number
}

type LegalSettings = {
  termsOfServiceUrl: string
  privacyPolicyUrl: string
  refundPolicyUrl: string
  cookiePolicyUrl: string
  companyName: string
  companyDocument: string
  companyAddress: string
}

export type SettingsByGroup = {
  general: GeneralSettings
  branding: BrandingSettings
  financial: FinancialSettings
  legal: LegalSettings
}

export const DEFAULT_SETTINGS: SettingsByGroup = {
  general: {
    platformName: 'Escola do Garoto;',
    platformDescription: 'Plataforma de cursos online',
    supportEmail: 'contato@exemplo.com.br',
    supportPhone: '',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    currency: 'BRL',
    maintenanceMode: false,
  },
  branding: {
    primaryColor: '#39FF88',
    secondaryColor: '#0D1117',
    accentColor: '#FF2E88',
    logoUrl: '/brand/garoto.svg',
    faviconUrl: '',
    fontFamily: 'Inter',
  },
  financial: {
    paymentGateway: 'mercadopago',
    pixEnabled: true,
    creditCardEnabled: true,
    boletoEnabled: false,
    maxInstallments: 12,
    defaultInstallments: 1,
  },
  legal: {
    termsOfServiceUrl: '/termos-de-uso',
    privacyPolicyUrl: '/politica-de-privacidade',
    refundPolicyUrl: '/politica-de-reembolso',
    cookiePolicyUrl: '/politica-de-cookies',
    companyName: 'Escola do Garoto;',
    companyDocument: '00.000.000/0001-00',
    companyAddress: 'Brasil',
  },
}

// ---------------------------------------------------------------------------------------------
// Chaves no banco
// ---------------------------------------------------------------------------------------------

export const SETTING_FIELDS: { [G in SettingsGroup]: Record<keyof SettingsByGroup[G], FieldDef> } =
  {
    general: {
      platformName: { key: 'site_name', isPublic: true, description: 'Nome público da plataforma' },
      platformDescription: {
        key: 'site_description',
        isPublic: true,
        description: 'Descrição pública da plataforma',
      },
      supportEmail: {
        key: 'support_email',
        isPublic: true,
        description: 'Email de suporte principal',
      },
      supportPhone: {
        key: 'support_phone',
        isPublic: true,
        description: 'Telefone de suporte principal',
      },
      timezone: {
        key: 'platform_timezone',
        isPublic: true,
        description: 'Fuso horário padrão da plataforma',
      },
      language: {
        key: 'platform_language',
        isPublic: true,
        description: 'Idioma padrão da plataforma',
      },
      currency: {
        key: 'platform_currency',
        isPublic: true,
        description: 'Moeda padrão da plataforma',
      },
      maintenanceMode: {
        key: 'maintenance_mode',
        isPublic: true,
        description: 'Define se a plataforma está em manutenção',
      },
    },
    branding: {
      primaryColor: { key: 'branding_primary_color', isPublic: true, description: 'Cor primária' },
      secondaryColor: {
        key: 'branding_secondary_color',
        isPublic: true,
        description: 'Cor secundária',
      },
      accentColor: { key: 'branding_accent_color', isPublic: true, description: 'Cor de destaque' },
      logoUrl: { key: 'branding_logo_url', isPublic: true, description: 'URL do logo' },
      faviconUrl: { key: 'branding_favicon_url', isPublic: true, description: 'URL do favicon' },
      fontFamily: { key: 'branding_font_family', isPublic: true, description: 'Fonte principal' },
    },
    financial: {
      paymentGateway: {
        key: 'payment_gateway',
        isPublic: true,
        description: 'Gateway de pagamento principal da plataforma',
      },
      pixEnabled: {
        key: 'payment_pix_enabled',
        isPublic: true,
        description: 'Define se PIX está habilitado no checkout',
      },
      creditCardEnabled: {
        key: 'payment_credit_card_enabled',
        isPublic: true,
        description: 'Define se cartão (crédito/débito) está habilitado no checkout',
      },
      boletoEnabled: {
        key: 'payment_boleto_enabled',
        isPublic: true,
        description: 'Define se boleto está habilitado no checkout',
      },
      maxInstallments: {
        key: 'payment_max_installments',
        isPublic: true,
        description: 'Quantidade máxima de parcelas no checkout',
      },
      defaultInstallments: {
        key: 'payment_default_installments',
        isPublic: true,
        description: 'Quantidade padrão de parcelas no checkout',
      },
    },
    legal: {
      termsOfServiceUrl: {
        key: 'legal_terms_of_service_url',
        isPublic: true,
        description: 'URL publica dos termos de uso',
      },
      privacyPolicyUrl: {
        key: 'legal_privacy_policy_url',
        isPublic: true,
        description: 'URL publica da politica de privacidade',
      },
      refundPolicyUrl: {
        key: 'legal_refund_policy_url',
        isPublic: true,
        description: 'URL publica da politica de reembolso',
      },
      cookiePolicyUrl: {
        key: 'legal_cookie_policy_url',
        isPublic: true,
        description: 'URL publica da politica de cookies',
      },
      companyName: {
        key: 'legal_company_name',
        isPublic: true,
        description: 'Nome da empresa exibido no rodape e paginas legais',
      },
      companyDocument: {
        key: 'legal_company_document',
        isPublic: true,
        description: 'Documento da empresa (CNPJ)',
      },
      companyAddress: {
        key: 'legal_company_address',
        isPublic: true,
        description: 'Endereço da empresa',
      },
    },
  }

// ---------------------------------------------------------------------------------------------
// Validação de entrada (admin salvando)
// ---------------------------------------------------------------------------------------------

const linkMessage = 'Informe uma URL valida (rota interna ou URL absoluta)'
const safeLink = z.string().trim().max(500).refine(isSafeUrl, linkMessage)
const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Informe uma cor no formato #RRGGBB')

const generalSettingsSchema = z.object({
  platformName: z.string().trim().min(2, 'Nome da plataforma é obrigatório').max(120),
  platformDescription: z.string().trim().max(500),
  supportEmail: z.string().trim().max(320).pipe(z.email('Email de suporte inválido')),
  supportPhone: z.string().trim().max(50),
  timezone: z.string().trim().min(2).max(100),
  language: z.string().trim().min(2).max(20),
  currency: z.string().trim().min(3).max(10),
  maintenanceMode: z.boolean(),
})

const brandingSettingsSchema = z
  .object({
    primaryColor: hexColor,
    secondaryColor: hexColor,
    accentColor: hexColor,
    // Vazio = sem imagem (o front cai no padrão). Preenchido: só link seguro.
    logoUrl: z.union([z.literal(''), safeLink]),
    faviconUrl: z.union([z.literal(''), safeLink]),
    // Vai para uma variável CSS: só letras, números, espaço, vírgula, hífen e aspas simples.
    fontFamily: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[\p{L}\p{N} ,'_-]+$/u, 'Nome de fonte inválido'),
  })
  .partial()

const financialSettingsSchema = z
  .object({
    paymentGateway: z.literal('mercadopago'),
    pixEnabled: z.boolean(),
    creditCardEnabled: z.boolean(),
    boletoEnabled: z.boolean(),
    maxInstallments: z.coerce.number().int().min(1).max(24),
    defaultInstallments: z.coerce.number().int().min(1).max(24),
  })
  .superRefine((value, ctx) => {
    if (!value.pixEnabled && !value.creditCardEnabled && !value.boletoEnabled) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ative ao menos um método de pagamento.',
        path: ['pixEnabled'],
      })
    }
    if (value.defaultInstallments > value.maxInstallments) {
      ctx.addIssue({
        code: 'custom',
        message: 'Parcela padrão não pode ser maior que o máximo de parcelas.',
        path: ['defaultInstallments'],
      })
    }
  })

const legalSettingsSchema = z.object({
  termsOfServiceUrl: safeLink.min(1, 'URL dos termos de uso e obrigatoria'),
  privacyPolicyUrl: safeLink.min(1, 'URL da politica de privacidade e obrigatoria'),
  refundPolicyUrl: safeLink.min(1, 'URL da politica de reembolso e obrigatoria'),
  cookiePolicyUrl: safeLink.min(1, 'URL da politica de cookies e obrigatoria'),
  companyName: z.string().trim().min(2, 'Nome da empresa é obrigatório').max(160),
  companyDocument: z.string().trim().min(14, 'Documento da empresa inválido').max(30),
  companyAddress: z.string().trim().min(5, 'Endereço da empresa é obrigatório').max(240),
})

export const SETTINGS_INPUT_SCHEMAS = {
  general: generalSettingsSchema,
  branding: brandingSettingsSchema,
  financial: financialSettingsSchema,
  legal: legalSettingsSchema,
} satisfies Record<SettingsGroup, z.ZodType>

// ---------------------------------------------------------------------------------------------
// Leitura tolerante (o valor no banco pode estar em formatos variados)
// ---------------------------------------------------------------------------------------------

function readString(value: unknown, fallback: string, allowEmpty: boolean): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 || allowEmpty ? trimmed : fallback
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function readNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return typeof value !== 'boolean' && value !== '' && Number.isFinite(numeric) ? numeric : fallback
}

/**
 * O valor pode estar gravado como texto JSON (`"\"#fff\""`). Se vier string que é JSON de
 * string, usa o conteúdo.
 */
function unwrapJsonString(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

/** Campos de texto que podem ficar vazios (o resto cai no padrão quando vazio). */
const OPTIONAL_TEXT_FIELDS = new Set(['platformDescription', 'supportPhone'])

/** Monta o objeto do grupo a partir das linhas do banco, completando com os padrões. */
export function buildGroup<G extends SettingsGroup>(
  group: G,
  rows: ReadonlyArray<{ key: string; value: unknown }>,
): SettingsByGroup[G] {
  const defaults = DEFAULT_SETTINGS[group] as Record<string, unknown>
  const fields = SETTING_FIELDS[group] as Record<string, FieldDef>
  const byKey = new Map(rows.map((row) => [row.key, row.value]))
  const result: Record<string, unknown> = { ...defaults }

  for (const [field, def] of Object.entries(fields)) {
    if (!byKey.has(def.key)) continue
    const raw = unwrapJsonString(byKey.get(def.key))
    const fallback = defaults[field]
    if (typeof fallback === 'boolean') result[field] = readBoolean(raw, fallback)
    else if (typeof fallback === 'number') result[field] = readNumber(raw, fallback)
    else if (field === 'paymentGateway') result[field] = 'mercadopago'
    else result[field] = readString(raw, String(fallback), OPTIONAL_TEXT_FIELDS.has(field))
  }

  // Grupos com regra cruzada: se o que está no banco ficou inválido, volta para o padrão.
  if (group === 'financial') {
    const checked = financialSettingsSchema.safeParse(result)
    return (checked.success ? checked.data : { ...defaults }) as SettingsByGroup[G]
  }
  return result as SettingsByGroup[G]
}

/** Chaves do banco de um grupo. */
export function groupKeys(group: SettingsGroup): string[] {
  return Object.values(SETTING_FIELDS[group] as Record<string, FieldDef>).map((def) => def.key)
}
