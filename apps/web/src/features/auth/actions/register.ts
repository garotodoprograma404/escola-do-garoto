'use server'

import { authService } from '../services/authService'
import { registerSchema } from '../lib/validations'

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

export async function registerAction(formData: FormData) {
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }
  const requestedRedirectPath = getSafeRedirectPath(formData.get('redirect_path'))

  const validation = registerSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  try {
    await authService.register(validation.data)

    // A conta só entra depois de confirmar o e-mail: nunca há login automático.
    return {
      success: true,
      autoLogin: false,
      redirect_path: requestedRedirectPath,
      message: 'Conta criada! Verifique seu email.',
    }
  } catch (error) {
    return { error: (error as Error).message }
  }
}
