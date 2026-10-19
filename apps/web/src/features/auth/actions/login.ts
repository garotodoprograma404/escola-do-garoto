'use server'

import { redirect } from 'next/navigation'
import { authService } from '../services/authService'
import { loginSchema } from '../lib/validations'
import { getRoleDashboardPath, getDefaultDashboardPath } from '@/shared/lib/navigation'

function getSafeRedirectPath(value: FormDataEntryValue | null): string | null {
  const rawPath = String(value || '').trim()

  if (!rawPath || !rawPath.startsWith('/') || rawPath.startsWith('//')) {
    return null
  }

  if (
    rawPath.startsWith('/login') ||
    rawPath.startsWith('/register') ||
    rawPath.startsWith('/forgot-password')
  ) {
    return null
  }

  return rawPath
}

export async function loginAction(formData: FormData) {
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const requestedRedirectPath = getSafeRedirectPath(formData.get('redirect_path'))

  const validation = loginSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // Fazer login
  let authData
  try {
    authData = await authService.login(validation.data)
  } catch (error) {
    return { error: (error as Error).message }
  }

  // Papel principal: o primeiro ativo (mais antigo).
  const role = authData.user.roles[0] ?? null

  // Determinar dashboard correto baseado na role
  const dashboardPath =
    requestedRedirectPath || (role ? getRoleDashboardPath(role) : getDefaultDashboardPath())

  // Redirecionar (FORA do try/catch)
  redirect(dashboardPath)
}
