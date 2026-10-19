'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/api-error'
import type { FinancialSettings as FinancialSettingsType } from '../types'

const DEFAULT_FINANCIAL_SETTINGS: FinancialSettingsType = {
  paymentGateway: 'mercadopago',
  pixEnabled: true,
  creditCardEnabled: true,
  boletoEnabled: false,
  maxInstallments: 12,
  defaultInstallments: 1,
}

export async function getFinancialSettingsForAdmin(): Promise<FinancialSettingsType> {
  const result = await apiServer<FinancialSettingsType>('/admin/settings/financial')
  if (!result.ok) {
    console.error('Error fetching admin financial settings:', result.error.message)
    return { ...DEFAULT_FINANCIAL_SETTINGS }
  }
  return result.data
}

export async function saveFinancialSettings(input: FinancialSettingsType) {
  const result = await apiServer<FinancialSettingsType>('/admin/settings/financial', {
    method: 'PUT',
    body: input,
  })

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível salvar as configurações financeiras'),
    }
  }

  revalidateTag('financial-settings', 'max')
  revalidatePath('/admin/settings')
  revalidatePath('/checkout')

  return { success: true, data: result.data }
}
