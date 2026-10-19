'use server'

import { redirect } from 'next/navigation'
import { authService } from '../services/authService'
import { resetPasswordSchema } from '../lib/validations'

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get('token') || '')

  if (!token) {
    return {
      error:
        'Link de recuperação inválido ou expirado. Solicite um novo link para redefinir sua senha.',
    }
  }

  const data = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validation = resetPasswordSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  try {
    await authService.resetPassword(token, validation.data.password)
  } catch (error) {
    return { error: (error as Error).message }
  }

  redirect('/login?reset=success')
}
