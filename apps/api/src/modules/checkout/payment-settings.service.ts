import { Inject, Injectable } from '@nestjs/common'
import { inArray } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import { platformSettings } from '../../database/schema/index.js'
import { PAYMENT_SETTING_KEYS } from './checkout.constants.js'
import type { CheckoutPaymentMethods } from './gateway/payment-gateway.js'

/** Padrões dos métodos de pagamento quando a plataforma ainda não configurou nada. */
const DEFAULTS: CheckoutPaymentMethods = {
  pixEnabled: true,
  creditCardEnabled: true,
  boletoEnabled: false,
  maxInstallments: 12,
  defaultInstallments: 1,
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function asNumber(value: unknown, fallback: number): number {
  const number = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** Lê as configurações dos métodos de pagamento (tela do admin em Configurações → Financeiro). */
@Injectable()
export class PaymentSettingsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getPaymentOptions(): Promise<CheckoutPaymentMethods> {
    const rows = await this.db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(inArray(platformSettings.key, Object.values(PAYMENT_SETTING_KEYS)))
    const byKey = new Map(rows.map((row) => [row.key, row.value]))

    const options: CheckoutPaymentMethods = {
      pixEnabled: asBoolean(byKey.get(PAYMENT_SETTING_KEYS.pixEnabled), DEFAULTS.pixEnabled),
      creditCardEnabled: asBoolean(
        byKey.get(PAYMENT_SETTING_KEYS.creditCardEnabled),
        DEFAULTS.creditCardEnabled,
      ),
      boletoEnabled: asBoolean(
        byKey.get(PAYMENT_SETTING_KEYS.boletoEnabled),
        DEFAULTS.boletoEnabled,
      ),
      maxInstallments: asNumber(
        byKey.get(PAYMENT_SETTING_KEYS.maxInstallments),
        DEFAULTS.maxInstallments,
      ),
      defaultInstallments: asNumber(
        byKey.get(PAYMENT_SETTING_KEYS.defaultInstallments),
        DEFAULTS.defaultInstallments,
      ),
    }

    // Configuração inconsistente (nada ligado, parcelas fora de 1..24 ou padrão acima do máximo):
    // volta ao padrão.
    const installmentsOk =
      Number.isInteger(options.maxInstallments) &&
      Number.isInteger(options.defaultInstallments) &&
      options.maxInstallments >= 1 &&
      options.maxInstallments <= 24 &&
      options.defaultInstallments >= 1 &&
      options.defaultInstallments <= options.maxInstallments
    const anyMethod = options.pixEnabled || options.creditCardEnabled || options.boletoEnabled
    return installmentsOk && anyMethod ? options : { ...DEFAULTS }
  }
}
