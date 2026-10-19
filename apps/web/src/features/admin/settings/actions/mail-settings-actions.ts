'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../lib/api-error'
import type { MailSettingsView } from '../types'

type Result<T = MailSettingsView> = { success: true; data: T } | { success: false; error: string }

export type MailSettingsForm = {
  host: string
  port: string
  secure: boolean
  user: string
  password: string
  fromName: string
  fromEmail: string
}

export async function getMailSettingsForAdmin(): Promise<MailSettingsView | null> {
  const result = await apiServer<MailSettingsView>('/admin/mail-settings')
  if (!result.ok) {
    console.error('Error fetching mail settings:', result.error.message)
    return null
  }
  return result.data
}

/** Senha em branco = mantém a salva (se o usuário for o mesmo). A API conecta no servidor antes de gravar. */
export async function saveMailSettings(form: MailSettingsForm): Promise<Result> {
  const port = Number(form.port)
  if (!form.host.trim() || !Number.isInteger(port)) {
    return { success: false, error: 'Preencha o servidor e a porta.' }
  }
  const body: Record<string, unknown> = {
    host: form.host.trim(),
    port,
    secure: form.secure,
    user: form.user.trim(),
    fromName: form.fromName.trim(),
    fromEmail: form.fromEmail.trim(),
  }
  if (form.password) body.password = form.password
  const result = await apiServer<MailSettingsView>('/admin/mail-settings', { method: 'PUT', body })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível salvar o servidor de e-mail.'),
    }
  }
  revalidatePath('/admin/settings')
  return { success: true, data: result.data }
}

export async function checkMailSettings(): Promise<Result> {
  const result = await apiServer<MailSettingsView>('/admin/mail-settings/check', {
    method: 'POST',
    body: {},
  })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível testar a conexão.'),
    }
  }
  return { success: true, data: result.data }
}

/** Manda um e-mail de teste para o e-mail do admin logado. */
export async function sendTestMail(): Promise<Result<{ sentTo: string }>> {
  const result = await apiServer<{ sentTo: string }>('/admin/mail-settings/test', {
    method: 'POST',
    body: {},
  })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível enviar o e-mail de teste.'),
    }
  }
  return { success: true, data: result.data }
}

export async function removeMailSettings(): Promise<Result> {
  const result = await apiServer<MailSettingsView>('/admin/mail-settings', { method: 'DELETE' })
  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Não foi possível remover o servidor de e-mail.'),
    }
  }
  revalidatePath('/admin/settings')
  return { success: true, data: result.data }
}
