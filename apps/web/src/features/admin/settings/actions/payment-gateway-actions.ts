'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/api-error'
import type { PaymentGatewayView } from '../types'

type Result = { success: true; data: PaymentGatewayView } | { success: false; error: string }

export async function getPaymentGatewayForAdmin(): Promise<PaymentGatewayView | null> {
  const result = await apiServer<PaymentGatewayView>('/admin/payment-gateway')
  if (!result.ok) {
    console.error('Error fetching payment gateway:', result.error.message)
    return null
  }
  return result.data
}

async function call(
  path: '/admin/payment-gateway' | '/admin/payment-gateway/check',
  method: 'PUT' | 'POST' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<Result> {
  const result = await apiServer<PaymentGatewayView>(path, { method, body })
  if (!result.ok) return { success: false, error: apiErrorMessage(result.error, fallback) }
  revalidatePath('/admin/settings')
  return { success: true, data: result.data }
}

/** Campo em branco = mantém o que já estava salvo. A API confere o token no Mercado Pago. */
export async function savePaymentGateway(input: {
  accessToken: string
  webhookSecret: string
}): Promise<Result> {
  const body: Record<string, string> = {}
  if (input.accessToken.trim()) body.accessToken = input.accessToken.trim()
  if (input.webhookSecret.trim()) body.webhookSecret = input.webhookSecret.trim()
  if (Object.keys(body).length === 0) {
    return { success: false, error: 'Preencha o Access Token ou a assinatura secreta.' }
  }
  return call('/admin/payment-gateway', 'PUT', body, 'Não foi possível salvar as credenciais.')
}

export async function checkPaymentGateway(): Promise<Result> {
  return call('/admin/payment-gateway/check', 'POST', {}, 'Não foi possível testar a conexão.')
}

export async function removePaymentGateway(): Promise<Result> {
  return call(
    '/admin/payment-gateway',
    'DELETE',
    undefined,
    'Não foi possível remover as credenciais.',
  )
}
